FinanceOne 모바일 APK 빌드 프로젝트 v1.4.7

준비물
1. Android Studio 설치
2. Android Studio SDK Manager에서 Android SDK Platform 36 및 Build-Tools 설치
3. JDK 21 설치
4. Node.js LTS 설치

빌드 방법
1. 이 폴더의 build-apk.bat 실행
2. 최초 실행은 npm/Gradle 의존성을 내려받으므로 인터넷 연결 필요
3. 성공하면 프로젝트 최상위에 FinanceOne-Mobile-v1.4.7-debug.apk 생성

Android Studio 방식
1. android 폴더를 Android Studio에서 열기
2. Gradle 동기화 완료 대기
3. Build > Build Bundle(s) / APK(s) > Build APK(s)
4. android/app/build/outputs/apk/debug/app-debug.apk 확인

설치 실패 시
- 기존에 설치된 FinanceOne과 새 APK의 서명이 다르면 업데이트 설치가 차단됨
- 설치된 앱의 versionCode가 더 높아도 다운그레이드가 차단됨
- 이 경우 먼저 앱에서 백업 파일을 내보낸 후 기존 앱을 삭제하고 새 APK 설치

중요
- 기존 앱 삭제 시 앱 내부 데이터가 지워질 수 있으므로 반드시 백업 먼저 진행
- 이 프로젝트는 정상 Gradle 빌드로 APK를 생성하도록 구성했으며 APK 파일을 직접 재압축해 만들지 않음
