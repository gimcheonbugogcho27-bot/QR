# 📱 QR 메이커

제목과 URL을 입력하고 **[QR 코드 만들기]** 를 누르면, 제목이 위에 적힌 QR 코드 이미지를 만들어 줍니다.

- 제목 + QR 이미지로 저장 (PNG, 게시용 고해상도)
- 주소 복사, 최근 만든 QR 20개 기록
- 다크 / 라이트 글래스 테마
- 인터넷 없이도 동작 (QR 생성 라이브러리 내장)

## 빌드
`main` 브랜치에 올리면 GitHub Actions가 자동으로
- Windows: `QRMaker_portable_x.exe`, `QRMaker_Setup_x.exe`
- Android: `QRMaker.apk`

를 만들어 **Releases** 에 올립니다. (Actions 탭 → Run workflow 로 수동 실행도 가능)

## 라이선스
QR 생성 코드: QRCode for JavaScript © Kazuhiko Arase (MIT)
