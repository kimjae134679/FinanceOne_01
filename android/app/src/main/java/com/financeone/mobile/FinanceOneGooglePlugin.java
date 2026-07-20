package com.financeone.mobile;

import android.app.PendingIntent;
import android.app.Activity;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.content.SharedPreferences;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.google.android.gms.auth.api.identity.AuthorizationClient;
import com.google.android.gms.auth.api.identity.AuthorizationRequest;
import com.google.android.gms.auth.api.identity.AuthorizationResult;
import com.google.android.gms.auth.api.identity.Identity;
import com.google.android.gms.common.api.Scope;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;
import java.net.HttpURLConnection;
import java.net.URLEncoder;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.Iterator;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name = "FinanceOneGoogle")
public class FinanceOneGooglePlugin extends Plugin {
    private static final String DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.appdata";
    private static final String BACKUP_NAME = "FinanceOne-data.json";
    private static final String LOCAL_BACKUP_NAME = "FinanceOneBackup.json";
    private static final String PREFS = "financeone_google";
    private static final String GUIDE_ACCOUNT = "kjkjkj100001@gmail.com";
    private final ExecutorService executor = Executors.newSingleThreadExecutor();

    private SharedPreferences prefs() {
        return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    private AuthorizationClient authClient() {
        return Identity.getAuthorizationClient(getActivity());
    }

    @PluginMethod
    public void googleStatus(PluginCall call) {
        JSObject result = new JSObject();
        result.put("connected", prefs().getBoolean("connected", false));
        result.put("configured", true);
        result.put("email", prefs().getString("email", ""));
        result.put("name", prefs().getString("name", ""));
        result.put("authMode", "AuthorizationClient");
        call.resolve(result);
    }

    @PluginMethod
    public void googleLogin(PluginCall call) {
        requestAuthorization(call, true, token -> {
            try {
                JSObject profile = fetchUserProfile(token);
                String email = profile.optString("email", GUIDE_ACCOUNT);
                String name = profile.optString("name", email);
                prefs().edit()
                    .putBoolean("connected", true)
                    .putString("email", email)
                    .putString("name", name)
                    .apply();
                JSObject result = new JSObject();
                result.put("connected", true);
                result.put("configured", true);
                result.put("email", email);
                result.put("name", name);
                result.put("authMode", "AuthorizationClient");
                call.resolve(result);
            } catch (Exception error) {
                call.reject(friendlyError(error));
            }
        });
    }

    @ActivityCallback
    private void handleAuthorizationResolution(PluginCall call, ActivityResult activityResult) {
        if (call == null) return;
        Intent data = activityResult.getData();
        if (data == null) {
            call.reject("Google 권한 승인이 취소되었습니다. 계정 " + GUIDE_ACCOUNT + "을 선택하고 Drive 접근을 허용하세요.");
            return;
        }
        try {
            AuthorizationResult result = authClient().getAuthorizationResultFromIntent(data);
            handleAuthorizationResult(call, result, token -> {
                try {
                    JSObject profile = fetchUserProfile(token);
                    String email = profile.optString("email", GUIDE_ACCOUNT);
                    String name = profile.optString("name", email);
                    prefs().edit()
                        .putBoolean("connected", true)
                        .putString("email", email)
                        .putString("name", name)
                        .apply();
                    JSObject response = new JSObject();
                    response.put("connected", true);
                    response.put("configured", true);
                    response.put("email", email);
                    response.put("name", name);
                    response.put("authMode", "AuthorizationClient");
                    call.resolve(response);
                } catch (Exception error) {
                    call.reject(friendlyError(error));
                }
            });
        } catch (Exception error) {
            call.reject(friendlyError(error));
        }
    }

    @PluginMethod
    public void googleUpload(PluginCall call) {
        if (!prefs().getBoolean("connected", false)) {
            call.reject("Google 계정을 먼저 연결하세요. 권장 계정: " + GUIDE_ACCOUNT);
            return;
        }
        requestAuthorization(call, false, token -> upload(call, token));
    }

    @PluginMethod
    public void googleDownload(PluginCall call) {
        if (!prefs().getBoolean("connected", false)) {
            call.reject("Google 계정을 먼저 연결하세요. 권장 계정: " + GUIDE_ACCOUNT);
            return;
        }
        requestAuthorization(call, false, token -> download(call, token));
    }

    @PluginMethod
    public void googleDisconnect(PluginCall call) {
        prefs().edit().clear().apply();
        JSObject result = new JSObject();
        result.put("connected", false);
        result.put("configured", true);
        result.put("authMode", "AuthorizationClient");
        call.resolve(result);
    }


    @PluginMethod
    public void exportBackup(PluginCall call) {
        try {
            String json = call.getData().toString();
            if (json.getBytes(StandardCharsets.UTF_8).length > 10 * 1024 * 1024) {
                call.reject("백업 데이터가 10MB를 초과했습니다.");
                return;
            }
            Intent intent = new Intent(Intent.ACTION_CREATE_DOCUMENT);
            intent.addCategory(Intent.CATEGORY_OPENABLE);
            intent.setType("application/json");
            intent.putExtra(Intent.EXTRA_TITLE, LOCAL_BACKUP_NAME);
            startActivityForResult(call, intent, "handleExportBackup");
        } catch (Exception error) {
            call.reject(friendlyError(error));
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
            call.reject(friendlyError(error));
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
            call.reject(friendlyError(error));
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
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int read;
            int total = 0;
            while ((read = input.read(chunk)) != -1) {
                total += read;
                if (total > 10 * 1024 * 1024) throw new Exception("10MB 이하 백업 파일만 복원할 수 있습니다.");
                buffer.write(chunk, 0, read);
            }
            String json = buffer.toString(StandardCharsets.UTF_8.name());
            JSObject result = new JSObject();
            result.put("canceled", false);
            result.put("uri", uri.toString());
            result.put("fileName", LOCAL_BACKUP_NAME);
            result.put("state", new JSONObject(json));
            call.resolve(result);
        } catch (Exception error) {
            call.reject(friendlyError(error));
        }
    }

    private interface TokenConsumer {
        void accept(String token) throws Exception;
    }

    private void requestAuthorization(PluginCall call, boolean interactive, TokenConsumer consumer) {
        AuthorizationRequest request = AuthorizationRequest.builder()
            .setRequestedScopes(Arrays.asList(
                new Scope(DRIVE_SCOPE),
                new Scope("openid"),
                new Scope("email"),
                new Scope("profile")
            ))
            .build();

        authClient().authorize(request)
            .addOnSuccessListener(result -> {
                if (result.hasResolution()) {
                    if (!interactive) {
                        call.reject("Drive 접근 권한 동의가 필요합니다. 설정에서 Google 계정 연결을 다시 누르고 권한 허용을 완료하세요.");
                        return;
                    }
                    PendingIntent pendingIntent = result.getPendingIntent();
                    Intent intent = new Intent(getActivity(), GoogleAuthActivity.class);
                    intent.putExtra("pendingIntent", pendingIntent);
                    startActivityForResult(call, intent, "handleAuthorizationResolution");
                } else {
                    handleAuthorizationResult(call, result, consumer);
                }
            })
            .addOnFailureListener(error -> call.reject(friendlyError(error)));
    }

    private void handleAuthorizationResult(PluginCall call, AuthorizationResult result, TokenConsumer consumer) {
        String token = result.getAccessToken();
        if (token == null || token.trim().isEmpty()) {
            call.reject("Google access token을 받지 못했습니다. Drive 권한을 허용했는지 확인하세요.");
            return;
        }
        executor.execute(() -> {
            try {
                consumer.accept(token);
            } catch (Exception error) {
                call.reject(friendlyError(error));
            }
        });
    }

    private JSObject fetchUserProfile(String token) throws Exception {
        try {
            String json = request("GET", "https://www.googleapis.com/oauth2/v3/userinfo", token, null, null);
            return toJSObject(new JSONObject(json));
        } catch (Exception ignored) {
            JSObject fallback = new JSObject();
            fallback.put("email", GUIDE_ACCOUNT);
            fallback.put("name", GUIDE_ACCOUNT);
            return fallback;
        }
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

    private void upload(PluginCall call, String token) throws Exception {
        String json = call.getData().toString();
        if (json.getBytes(StandardCharsets.UTF_8).length > 10 * 1024 * 1024) {
            throw new Exception("백업 데이터가 10MB를 초과했습니다.");
        }
        String id = findBackup(token);
        String response;
        if (id != null) {
            response = request("PATCH", "https://www.googleapis.com/upload/drive/v3/files/" + id + "?uploadType=media&fields=id,modifiedTime", token, "application/json; charset=utf-8", json);
        } else {
            String boundary = "financeone_" + UUID.randomUUID().toString().replace("-", "");
            String metadata = new JSONObject()
                .put("name", BACKUP_NAME)
                .put("parents", new JSONArray().put("appDataFolder"))
                .put("mimeType", "application/json")
                .toString();
            String body = "--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + metadata
                + "\r\n--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n" + json
                + "\r\n--" + boundary + "--";
            response = request("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,modifiedTime", token, "multipart/related; boundary=" + boundary, body);
        }
        call.resolve(new JSObject(response));
    }

    private void download(PluginCall call, String token) throws Exception {
        String id = findBackup(token);
        if (id == null) throw new Exception("Google Drive에 저장된 FinanceOne 데이터가 없습니다.");
        String json = request("GET", "https://www.googleapis.com/drive/v3/files/" + id + "?alt=media", token, null, null);
        JSObject result = new JSObject();
        result.put("state", new JSONObject(json));
        call.resolve(result);
    }

    private String findBackup(String token) throws Exception {
        String query = URLEncoder.encode("name='" + BACKUP_NAME + "' and trashed=false", "UTF-8");
        String url = "https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=" + query + "&fields=files(id,modifiedTime)&orderBy=modifiedTime%20desc&pageSize=1";
        JSONObject result = new JSONObject(request("GET", url, token, null, null));
        JSONArray files = result.optJSONArray("files");
        return files == null || files.length() == 0 ? null : files.getJSONObject(0).getString("id");
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
        StringBuilder text = new StringBuilder();
        if (stream != null) {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(stream, StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) text.append(line);
            }
        }
        connection.disconnect();
        if (code < 200 || code >= 300) throw new Exception("Google API 오류 (" + code + "): " + text);
        return text.toString();
    }

    private String friendlyError(Throwable error) {
        String message = error == null ? "" : error.getMessage();
        if (message == null) message = "";
        if (message.contains("UnregisteredOnApiConsole") || message.contains("DEVELOPER_ERROR") || message.contains("INVALID_AUDIENCE")) {
            return "Google OAuth 설정이 APK와 맞지 않습니다. Google Cloud의 Android OAuth Client에 패키지명 com.financeone.mobile / 현재 APK SHA-1을 정확히 등록하세요. 현재 기준 SHA-1: B0:D7:8B:6D:E5:FE:72:52:DD:24:00:55:3B:1B:B4:2D:D5:F1:67:7B";
        }
        if (message.contains("403") || message.contains("insufficient")) {
            return "Google Drive appDataFolder 권한이 부족합니다. OAuth 데이터 액세스에 drive.appdata 범위가 있는지 확인하고 Google 계정을 다시 연결하세요.";
        }
        return message.isEmpty() ? "Google 연동 중 오류가 발생했습니다." : message;
    }

    @Override
    protected void handleOnDestroy() {
        executor.shutdown();
    }
}
