# Phân tích nhu cầu thuê xe theo thời gian

App web tiếng Việt, chạy cục bộ bằng Node.js 18 trở lên. Không cần cài thêm thư viện, không cần API key hoặc kết nối Internet.

## Chạy app

Mở terminal tại thư mục dự án:

```powershell
npm start
```

Sau đó mở **http://localhost:3000**. Dừng bằng Ctrl+C. Nếu PowerShell chặn npm.ps1, chạy `node server.mjs` hoặc `npm.cmd start`.

Đổi cổng nếu cần: `$env:PORT=3001` rồi `node server.mjs`.

## Chức năng

- Lọc khoảng ngày, ngày làm việc/ngày nghỉ, nhóm khách và khu vực nếu dữ liệu có cung cấp.
- Tổng lượt thuê, trung bình theo ngày, giờ cao điểm, ngày cao điểm.
- Xu hướng ngày/tháng, biểu đồ giờ, bản đồ nhiệt thứ–giờ và top 10 ngày.
- So sánh khu vực khi nhập CSV có cột `area`; hiển thị tổng và độ phủ giờ của mỗi khu vực.
- Nhập CSV trên trình duyệt, xuất báo cáo theo bộ lọc hiện tại, trở về bộ dữ liệu gốc.

## Dữ liệu và giới hạn

`archive/hour.csv`: 17.379 bản ghi giờ trong 731 ngày, 2011-01-01 đến 2012-12-31; tổng 3.292.679 lượt thuê xe đạp Capital Bikeshare tại Washington, D.C. `day.csv` là cùng dữ liệu tổng hợp theo ngày, chỉ dùng trong kiểm thử đối chiếu; không cộng hai tệp với nhau.

**Không có thông tin trạm/quận/khu vực trong dữ liệu gốc. Không thể kết luận khu vực có nhu cầu cao nhất từ hai tệp này.** App hiển thị rõ giới hạn đó, không tạo địa điểm giả.

Lượt thuê là số lượt phát sinh, không phải số người duy nhất hay toàn bộ nhu cầu tiềm ẩn. Kết quả là mô tả lịch sử, không dự báo nhu cầu tương lai. Ngày và giờ giữ nguyên theo nguồn.

Giờ cao điểm được xếp theo trung bình lượt trên các mốc ngày–giờ thực sự có dữ liệu. Các dòng của nhiều khu vực tại cùng thời điểm được cộng lại trước khi tính trung bình toàn hệ thống. Không tự gán 0 cho giờ thiếu. Dữ liệu gốc thiếu 165/17.544 mốc giờ. Trung bình ngày chia cho số ngày có dữ liệu phù hợp. Ngày/tháng/khu vực được xếp theo tổng; tháng bị lọc một phần có tổng trong phần đó. Đồng hạng chọn mốc đầu theo thứ tự thời gian, khu vực theo tên. Độ phủ khác nhau giữa khu vực hoặc kỳ có thể ảnh hưởng thứ hạng; app hiển thị số giờ để hỗ trợ diễn giải.

## CSV bổ sung khu vực

UTF-8, phân cách dấu phẩy, tối đa 20 MB. Mỗi dòng là một tổ hợp **ngày–giờ–khu vực duy nhất**. Nếu dữ liệu ban đầu theo trạm, gộp thành khu vực trước khi nhập. Tệp được xử lý trong bộ nhớ trình duyệt, không lưu lại sau khi tải lại trang.

| Cột | Quy định |
| --- | --- |
| dteday | Bắt buộc, ngày hợp lệ YYYY-MM-DD |
| hr | Bắt buộc, số nguyên 0–23 |
| cnt | Bắt buộc, tổng lượt thuê nguyên không âm |
| area | Tùy chọn; nếu có cột thì mọi dòng phải có tên khu vực |
| casual, registered | Tùy chọn, cần cả hai để lọc nhóm khách; tổng phải bằng cnt |
| workingday | Tùy chọn, 1 = làm việc, 0 = nghỉ/lễ; không tự suy ra ngày lễ |

Nút “Mẫu cột CSV” tải tiêu đề trống để điền dữ liệu thực. Không nhập `day.csv` vì không có giờ. Trình nhập từ chối ngày/giờ/lượt không hợp lệ, khóa trùng, thiếu cột, hoặc tổng nhóm khách không khớp.

## Kiểm tra

```powershell
node --test
```

Kiểm tra đối chiếu tất cả tổng ngày với `day.csv`, tổng toàn bộ dữ liệu, giờ thiếu, bộ lọc, trung bình theo khu vực, dữ liệu lỗi, CSV có dấu ngoặc kép và bảo vệ ô công thức khi xuất CSV.

Kiểm thử luồng giao diện sử dụng DOM mô phỏng để kiểm tra khởi tạo, bộ lọc, trạng thái rỗng, nhập CSV, đặt lại và xuất báo cáo. Chưa kiểm tra trực quan trong trình duyệt ở môi trường phát triển này do không có trình duyệt kết nối.

## Cấu trúc

`server.mjs` phục vụ các tài nguyên cho phép trên địa chỉ loopback. `public/analysis.js` chứa hàm kiểm tra và tổng hợp dữ liệu, dùng chung cho giao diện và kiểm thử. `public/app.js`, `index.html`, `style.css` là giao diện không dùng thư viện bên ngoài. Thư mục `archive` được giữ nguyên.

Nguồn: `archive/Readme.txt`. Hadi Fanaee-T và João Gama, *Event labeling combining ensemble detectors and background knowledge*, Progress in Artificial Intelligence (2013), DOI: 10.1007/s13748-013-0040-3.
