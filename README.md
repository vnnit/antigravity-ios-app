# Antigravity Remote — Ứng dụng iOS điều khiển AI Agent trực tiếp

Ứng dụng iOS chuyên dụng giúp bạn kết nối và điều khiển trực tiếp phiên làm việc **Remote Control** của AI Agent từ xa (như hình QR code bạn cung cấp) mà **không cần mở Safari**, không bị che khuất bởi thanh địa chỉ web, tự động ghi nhớ phiên kết nối và có camera quét mã QR tích hợp.

---

## ✨ Tính năng nổi bật

- 📱 **Toàn màn hình (Edge-to-Edge)**: Loại bỏ hoàn toàn thanh địa chỉ và thanh công cụ của Safari.
- ⚡ **Auto-Connect**: Mở app lên là tự động kết nối thẳng vào phiên làm việc gần nhất.
- 📷 **Camera QR Scanner tích hợp**: Quét trực tiếp mã QR trên màn hình máy tính để kết nối tức thì.
- ☀️ **Keep Screen Awake**: Tự động chống tắt màn hình (ngủ máy) khi Agent đang thực hiện tác vụ dài.
- 🏝️ **Floating Island Toolbar**: Thanh điều khiển nổi thu gọn thông minh (Thoát, Tải lại, Giữ sáng màn hình, Sao chép link).
- 💾 **Lưu trữ đa thiết bị**: Quản lý danh sách các Remote Agent/Server đã từng kết nối.

---

## 🚀 Hướng dẫn chạy trên iPhone ngay lập tức (Không cần Xcode / Tài khoản Apple Developer)

### Bước 1: Cài đặt Expo Go trên iPhone
- Mở **App Store** trên iPhone của bạn và tìm kiếm: **Expo Go** (hoặc tải tại [https://apps.apple.com/app/expo-go/id982107779](https://apps.apple.com/app/expo-go/id982107779)).

### Bước 2: Khởi động máy chủ phát triển
Tại thư mục dự án trên máy Mac, chạy lệnh:
```bash
npx expo start
```

### Bước 3: Mở app trên iPhone
- Đảm bảo iPhone và máy tính cùng kết nối chung mạng Wi-Fi (hoặc chạy qua tunnel bằng lệnh `npx expo start --tunnel`).
- Mở ứng dụng **Camera** trên iPhone và quét mã QR hiển thị trong terminal.
- Ứng dụng **Antigravity Remote** sẽ mở và chạy trực tiếp trên iPhone của bạn!

### Bước 4: Điều khiển Remote Agent
1. Trên máy tính của bạn, mở bảng **Remote Control** (như trong hình ảnh).
2. Trong app iOS, bấm nút **"Quét mã QR Remote Control"**.
3. Chĩa camera vào mã QR trên máy tính.
4. App sẽ kết nối và hiển thị màn hình chat điều khiển Agent trực tiếp!

---

## 📦 Xuất thành file IPA / Dự án Xcode Native (Tuỳ chọn)

Nếu bạn muốn đóng gói thành file cài đặt độc lập (`.ipa`) hoặc mở trực tiếp trong Xcode:

1. **Sinh project Xcode native**:
   ```bash
   npx expo prebuild
   ```
2. **Mở dự án trong Xcode**:
   ```bash
   open ios/AntigravityRemote.xcworkspace
   ```
3. **Build thành file .ipa qua EAS**:
   ```bash
   npm install -g eas-cli
   eas build -p ios --profile preview
   ```

---

## 📁 Cấu trúc mã nguồn

- `App.tsx`: Quản lý luồng khởi động và điều hướng màn hình.
- `src/screens/ConnectScreen.tsx`: Màn hình chọn thiết bị, nhập link và nút mở camera quét QR.
- `src/screens/RemoteViewScreen.tsx`: Màn hình WebView tối ưu hoá cho mobile hiển thị giao diện Agent.
- `src/components/QRScannerModal.tsx`: Camera quét mã QR với hiệu ứng radar laser.
- `src/components/FloatingToolbar.tsx`: Thanh điều khiển nổi linh hoạt.
- `src/services/StorageService.ts`: Quản lý AsyncStorage lưu trữ thiết bị & cấu hình.
