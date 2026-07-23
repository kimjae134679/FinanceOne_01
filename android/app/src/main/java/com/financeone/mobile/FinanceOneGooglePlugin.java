package com.financeone.mobile;

import android.accounts.Account;
import android.accounts.AccountManager;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.pm.Signature;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.BufferedReader;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URLEncoder;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Iterator;
import java.util.Locale;
import java.util.TimeZone;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "FinanceOneGoogle")
public class FinanceOneGooglePlugin extends Plugin {
    private static final String DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
    private static final String LEGACY_BACKUP_NAME = "FinanceOne-data.json";
    private static final String LOCAL_BACKUP_NAME = "FinanceOneBackup.json";
    private static final String PREFS = "financeone_google";
    private static final String GOOGLE_ACCOUNT_TYPE = "com.google";
    private static final String AUTH_TOKEN_TYPE = "oauth2:" + DRIVE_SCOPE;
    private static final String CLOUD_CREDENTIALS_URL = "https://console.cloud.google.com/apis/credentials";
    private static final int MAX_BACKUP_BYTES = 10 * 1024 * 1024;
    private final ExecutorService executor = Executors.newSingleThreadExecutor();
    private volatile String lastToken;

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    @PluginMethod
    public void googleStatus(PluginCall call) {
        JSObject result = baseStatus();
        result.put("connected", prefs().getBoolean("connected", false));
        result.put("email", prefs().getString("email", ""));
        result.put("name", prefs().getString("name", ""));
        result.put("lastBackupTime", prefs().getString("lastBackupTime", ""));
        call.resolve(result);
    }

    private JSObject baseStatus() {
        JSObject result = new JSObject();
        result.put("configured", true);
        result.put("authMode", "AccountPicker");
        result.put("packageName", getContext().getPackageName());
        result.put("sha1", signingSha1());
        result.put("cloudConsoleUrl", CLOUD_CREDENTIALS_URL);
        result.put("appVersion", appVersion());
        return result;
    }

    @PluginMethod
    public void googleLogin(PluginCall call) {
        Intent picker = AccountManager.newChooseAccountIntent(
            null, null, new String[]{GOOGLE_ACCOUNT_TYPE}, null, null, null, null
        );
        startActivityForResult(call, picker, "handleAccountPicked");
    }

    @ActivityCallback
    private void handleAccountPicked(PluginCall call, ActivityResult activityResult) {
        if (call == null) return;
        Intent data = activityResult.getData();
        if (activityResult.getResultCode() != Activity.RESULT_OK || data == null) {
            call.reject("Google 계정 선택이 취소되었습니다.", "ACCOUNT_PICKER_CANCELED");
            return;
        }
        String email = data.getStringExtra(AccountManager.KEY_ACCOUNT_NAME);
        if (email == null || email.trim().isEmpty()) {
            call.reject("선택한 Google 계정을 확인할 수 없습니다.", "ACCOUNT_NOT_FOUND");
            return;
        }
        prefs().edit().putString("email", email).putString("pendingAccount", email).apply();
        requestAuthorization(call, email, token -> completeLogin(call, email));
    }

    @PluginMethod
    public void googleUpload(PluginCall call) {
        withConnectedToken(call, token -> upload(call, token));
    }

    @PluginMethod
    public void googleDownload(PluginCall call) {
        withConnectedToken(call, token -> restoreLatest(call, token));
    }

    @PluginMethod
    public void listBackups(PluginCall call) {
        withConnectedToken(call, token -> listBackupsInternal(call, token));
    }

    @PluginMethod
    public void restoreBackup(PluginCall call) {
        String fileId = call.getString("fileId", "");
        if (fileId.trim().isEmpty()) {
            call.reject("복원할 백업을 선택하세요.", "BACKUP_NOT_SELECTED");
            return;
        }
        withConnectedToken(call, token -> restoreById(call, token, fileId));
    }

    @PluginMethod
    public void deleteBackup(PluginCall call) {
        String fileId = call.getString("fileId", "");
        if (fileId.trim().isEmpty()) {
            call.reject("삭제할 백업을 선택하세요.", "BACKUP_NOT_SELECTED");
            return;
        }
        withConnectedToken(call, token -> {
            request("DELETE", "https://www.googleapis.com/drive/v3/files/" + encodePath(fileId), token, null, null);
            JSObject result = new JSObject();
            result.put("success", true);
            call.resolve(result);
        });
    }

    @PluginMethod
    public void openGoogleCloudConsole(PluginCall call) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(CLOUD_CREDENTIALS_URL));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(intent);
            call.resolve(baseStatus());
        } catch (Exception error) {
            reject(call, error);
        }
    }

    @PluginMethod
    public void googleDisconnect(PluginCall call) {
        String token = lastToken;
        if (token != null && !token.isEmpty()) {
            AccountManager.get(getContext()).invalidateAuthToken(GOOGLE_ACCOUNT_TYPE, token);
        }
        lastToken = null;
        prefs().edit().clear().apply();
        JSObject result = baseStatus();
        result.put("connected", false);
        result.put("email", "");
        result.put("name", "");
        result.put("lastBackupTime", "");
        call.resolve(result);
    }

    @PluginMethod
    public void exportBackup(PluginCall call) {
        try {
            String json = call.getData().toString();
            enforceSize(json);
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");
            intent.putExtra(Intent.EXTRA_TITLE, LOCAL_BACKUP_NAME);
            startActivityForResult(call, intent, "handleExportBackup");
        } catch (Exception error) {
            reject(call, error);
        }
    }

    @ActivityCallback
    private void handleExportBackup(PluginCall call, ActivityResult activityResult) {
        if (call == null) return;
        if (activityResult.getResultCode() != Activity.RESULT_OK || activityResult.getData() == null || activityResult.getData().getData() == null) {
            JSObject result = new JSObject();
            result.put("canceled", true);
            call.resolve(result);
            return;
        }
        Uri uri = activityResult.getData().getData();
        try (OutputStream output = getContext().getContentResolver().openOutputStream(uri, "wt")) {
            if (output == null) throw new Exception("선택한 위치에 파일을 저장할 수 없습니다.");
            output.write(call.getData().toString().getBytes(StandardCharsets.UTF_8));
            JSObject result = new JSObject();
            result.put("canceled", false);
            result.put("uri", uri.toString());
            call.resolve(result);
        } catch (Exception error) {
            reject(call, error);
        }
    }

    @PluginMethod
    public void importBackup(PluginCall call) {
        try {
            Intent intent = new Intent(Intent.ACTION_OPEN_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");
            startActivityForResult(call, intent, "handleImportBackup");
        } catch (Exception error) {
            reject(call, error);
        }
    }

    @ActivityCallback
    private void handleImportBackup(PluginCall call, ActivityResult activityResult) {
        if (call == null) return;
        if (activityResult.getResultCode() != Activity.RESULT_OK || activityResult.getData() == null || activityResult.getData().getData() == null) {
            JSObject result = new JSObject();
            result.put("canceled", true);
            call.resolve(result);
            return;
        }
        Uri uri = activityResult.getData().getData();
        try (InputStream input = getContext().getContentResolver().openInputStream(uri)) {
            if (input == null) throw new Exception("선택한 백업 파일을 읽을 수 없습니다.");
            String json = readLimited(input);
            JSObject result = new JSObject();
            result.put("canceled", false);
            result.put("uri", uri.toString());
            result.put("fileName", LOCAL_BACKUP_NAME);
            result.put("state", unwrapBackup(new JSONObject(json)));
            call.resolve(result);
        } catch (Exception error) {
            reject(call, error);
        }
    }

    private interface TokenConsumer {
        void accept(String token) throws Exception;
    }

    private void withConnectedToken(PluginCall call, TokenConsumer consumer) {
        String email = prefs().getString("email", "");
        if (!prefs().getBoolean("connected", false) || email.isEmpty()) {
            call.reject("Google 계정을 먼저 연결하세요.", "NOT_CONNECTED");
            return;
        }
        requestAuthorization(call, email, consumer);
    }

    private void requestAuthorization(PluginCall call, String email, TokenConsumer consumer) {
        Account account = new Account(email, GOOGLE_ACCOUNT_TYPE);
        Bundle options = new Bundle();
        AccountManager.get(getContext()).getAuthToken(
            account, AUTH_TOKEN_TYPE, options, getActivity(), future -> {
                try {
                    Bundle bundle = future.getResult();
                    String token = bundle.getString(AccountManager.KEY_AUTHTOKEN);
                    Intent consent = bundle.getParcelable(AccountManager.KEY_INTENT);
                    if (token == null || token.trim().isEmpty()) {
                        if (consent != null) {
                            getActivity().runOnUiThread(() -> startActivityForResult(call, consent, "handleAuthorizationConsent"));
                            return;
                        }
                        throw new Exception("Google Drive 권한을 받지 못했습니다.");
                    }
                    lastToken = token;
                    executor.execute(() -> consumeWith401Retry(call, account, token, consumer));
                } catch (Exception error) {
                    reject(call, error);
                }
            }, null
        );
    }

    @ActivityCallback
    private void handleAuthorizationConsent(PluginCall call, ActivityResult result) {
        if (call == null) return;
        if (result.getResultCode() != Activity.RESULT_OK) {
            call.reject("Google Drive 접근 권한이 허용되지 않았습니다.", "AUTH_CONSENT_DENIED");
            return;
        }
        String email = prefs().getString("pendingAccount", prefs().getString("email", ""));
        requestAuthorization(call, email, token -> completeLogin(call, email));
    }

    private void consumeWith401Retry(PluginCall call, Account account, String token, TokenConsumer consumer) {
        try {
            consumer.accept(token);
        } catch (HttpStatusException error) {
            if (error.status != 401) {
                reject(call, error);
                return;
            }
            try {
                AccountManager manager = AccountManager.get(getContext());
                manager.invalidateAuthToken(GOOGLE_ACCOUNT_TYPE, token);
                String refreshed = manager.blockingGetAuthToken(account, AUTH_TOKEN_TYPE, true);
                if (refreshed == null || refreshed.isEmpty()) throw error;
                lastToken = refreshed;
                consumer.accept(refreshed);
            } catch (Exception retryError) {
                reject(call, retryError);
            }
        } catch (Exception error) {
            reject(call, error);
        }
    }

    private void completeLogin(PluginCall call, String email) {
        prefs().edit()
            .putBoolean("connected", true)
            .putString("email", email)
            .putString("name", email)
            .remove("pendingAccount")
            .apply();
        JSObject result = baseStatus();
        result.put("connected", true);
        result.put("email", email);
        result.put("name", email);
        result.put("lastBackupTime", prefs().getString("lastBackupTime", ""));
        call.resolve(result);
    }

    private void upload(PluginCall call, String token) throws Exception {
        JSONObject state = new JSONObject(call.getData().toString());
        String createdAt = isoNow();
        String fileName = "financeone-backup-" + fileStamp() + ".json";
        JSONObject envelope = new JSONObject()
            .put("appName", "FinanceOne")
            .put("appVersion", appVersion())
            .put("schemaVersion", 5)
            .put("createdAt", createdAt)
            .put("deviceInfo", "Android " + Build.VERSION.RELEASE)
            .put("data", state);
        String json = envelope.toString();
        enforceSize(json);
        String boundary = "financeone_" + UUID.randomUUID().toString().replace("-", "");
        String metadata = new JSONObject()
            .put("name", fileName)
            .put("parents", new JSONArray().put("appDataFolder"))
            .put("mimeType", "application/json")
            .put("appProperties", new JSONObject().put("appVersion", appVersion()).put("schemaVersion", "5"))
            .toString();
        String body = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + metadata
            + "\r\n--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + json
            + "\r\n--" + boundary + "--";
        String response = request("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,createdTime,modifiedTime,size", token, "multipart/related; boundary=" + boundary, body);
        prefs().edit().putString("lastBackupTime", createdAt).apply();
        JSObject result = toJSObject(new JSONObject(response));
        result.put("lastBackupTime", createdAt);
        call.resolve(result);
    }

    private void listBackupsInternal(PluginCall call, String token) throws Exception {
        JSObject result = new JSObject();
        result.put("files", fetchBackups(token));
        result.put("lastBackupTime", prefs().getString("lastBackupTime", ""));
        call.resolve(result);
    }

    private JSONArray fetchBackups(String token) throws Exception {
        String query = URLEncoder.encode("trashed=false", "UTF-8");
        String fields = URLEncoder.encode("files(id,name,createdTime,modifiedTime,size,appProperties)", "UTF-8");
        String url = "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=" + query + "&fields=" + fields + "&orderBy=modifiedTime%20desc&pageSize=100";
        JSONObject result = new JSONObject(request("GET", url, token, null, null));
        JSONArray source = result.optJSONArray("files");
        JSONArray files = new JSONArray();
        if (source == null) return files;
        for (int i = 0; i < source.length(); i++) {
            JSONObject file = source.getJSONObject(i);
            String name = file.optString("name", "");
            if (!name.startsWith("financeone-backup-") && !LEGACY_BACKUP_NAME.equals(name) && !"financeone-backup.json".equals(name)) continue;
            JSONObject props = file.optJSONObject("appProperties");
            file.put("appVersion", props == null ? "이전 버전" : props.optString("appVersion", "이전 버전"));
            files.put(file);
        }
        return files;
    }

    private void restoreLatest(PluginCall call, String token) throws Exception {
        JSONArray files = fetchBackups(token);
        if (files.length() == 0) throw new Exception("Google Drive에 저장된 FinanceOne 백업이 없습니다.");
        restoreById(call, token, files.getJSONObject(0).getString("id"));
    }

    private void restoreById(PluginCall call, String token, String fileId) throws Exception {
        String json = request("GET", "https://www.googleapis.com/drive/v3/files/" + encodePath(fileId) + "?alt=media", token, null, null);
        JSObject result = new JSObject();
        result.put("state", unwrapBackup(new JSONObject(json)));
        result.put("fileId", fileId);
        call.resolve(result);
    }

    private JSONObject unwrapBackup(JSONObject json) throws Exception {
        Object data = json.opt("data");
        return data instanceof JSONObject ? (JSONObject) data : json;
    }

    private String request(String method, String url, String token, String contentType, String body) throws Exception {
        HttpURLConnection connection = (HttpURLConnection) new URL(url).openConnection();
        connection.setRequestMethod(method);
        connection.setConnectTimeout(15000);
        connection.setReadTimeout(30000);
        connection.setRequestProperty("Authorization", "Bearer " + token);
        connection.setRequestProperty("Accept", "application/json");
        if (body != null) {
            connection.setDoOutput(true);
            connection.setRequestProperty("Content-Type", contentType);
            try (OutputStream output = connection.getOutputStream()) {
                output.write(body.getBytes(StandardCharsets.UTF_8));
            }
        }
        int code = connection.getResponseCode();
        InputStream stream = code >= 200 && code < 300 ? connection.getInputStream() : connection.getErrorStream();
        String text = stream == null ? "" : readStream(stream);
        connection.disconnect();
        if (code < 200 || code >= 300) throw new HttpStatusException(code, text);
        return text;
    }

    private String readStream(InputStream stream) throws Exception {
        StringBuilder text = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
            String line;
            while ((line = reader.readLine()) != null) text.append(line);
        }
        return text.toString();
    }

    private String readLimited(InputStream input) throws Exception {
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        byte[] chunk = new byte[8192];
        int read;
        int total = 0;
        while ((read = input.read(chunk)) != -1) {
            total += read;
            if (total > MAX_BACKUP_BYTES) throw new Exception("10MB 이하 백업 파일만 복원할 수 있습니다.");
            buffer.write(chunk, 0, read);
        }
        return buffer.toString(StandardCharsets.UTF_8.name());
    }

    private void enforceSize(String json) throws Exception {
        if (json.getBytes(StandardCharsets.UTF_8).length > MAX_BACKUP_BYTES) throw new Exception("백업 데이터가 10MB를 초과했습니다.");
    }

    private String appVersion() {
        try {
            return getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0).versionName;
        } catch (Exception ignored) {
            return "1.4.9";
        }
    }

    private String signingSha1() {
        try {
            PackageManager pm = getContext().getPackageManager();
            PackageInfo info;
            Signature[] signatures;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                info = pm.getPackageInfo(getContext().getPackageName(), PackageManager.GET_SIGNING_CERTIFICATES);
                signatures = info.signingInfo.getApkContentsSigners();
            } else {
                info = pm.getPackageInfo(getContext().getPackageName(), PackageManager.GET_SIGNATURES);
                signatures = info.signatures;
            }
            byte[] digest = MessageDigest.getInstance("SHA-1").digest(signatures[0].toByteArray());
            StringBuilder result = new StringBuilder();
            for (byte value : digest) {
                if (result.length() > 0) result.append(':');
                result.append(String.format(Locale.US, "%02X", value));
            }
            return result.toString();
        } catch (Exception ignored) {
            return "확인 실패";
        }
    }

    private String isoNow() {
        SimpleDateFormat format = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss'Z'", Locale.US);
        format.setTimeZone(TimeZone.getTimeZone("UTC"));
        return format.format(new Date());
    }

    private String fileStamp() {
        SimpleDateFormat format = new SimpleDateFormat("yyyyMMdd-HHmmss", Locale.US);
        format.setTimeZone(TimeZone.getDefault());
        return format.format(new Date());
    }

    private String encodePath(String value) throws Exception {
        return URLEncoder.encode(value, "UTF-8").replace("+", "%20");
    }

    private JSObject toJSObject(JSONObject source) throws Exception {
        JSObject target = new JSObject();
        Iterator<String> keys = source.keys();
        while (keys.hasNext()) {
            String key = keys.next();
            target.put(key, source.get(key));
        }
        return target;
    }

    private void reject(PluginCall call, Throwable error) {
        String message = error == null || error.getMessage() == null ? "" : error.getMessage();
        if (isOAuthMismatch(message)) {
            call.reject("Google 계정 연결 설정이 필요합니다. 설정 화면의 ‘해결 방법’을 눌러 안내대로 등록하세요.", "OAUTH_CONFIG_MISMATCH", error instanceof Exception ? (Exception) error : null);
            return;
        }
        if (message.contains("403") || message.toLowerCase(Locale.US).contains("insufficient")) {
            call.reject("Google Drive 앱 전용 백업 권한이 없습니다. 계정을 연결 해제한 뒤 다시 연결해 주세요.", "DRIVE_PERMISSION_DENIED", error instanceof Exception ? (Exception) error : null);
            return;
        }
        call.reject(message.isEmpty() ? "Google 연동 중 오류가 발생했습니다." : message, "GOOGLE_ERROR", error instanceof Exception ? (Exception) error : null);
    }

    private boolean isOAuthMismatch(String message) {
        return message.contains("UnregisteredOnApiConsole") || message.contains("DEVELOPER_ERROR") || message.contains("INVALID_AUDIENCE");
    }

    private static class HttpStatusException extends Exception {
        final int status;
        HttpStatusException(int status, String body) {
            super("Google Drive 오류 (" + status + "): " + body);
            this.status = status;
        }
    }

    @Override
    protected void handleOnDestroy() {
        lastToken = null;
        executor.shutdown();
    }
}
