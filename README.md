Mục tiêu là tìm hiểu thời điểm nhu cầu tăng hoặc giảm, sau đó dự báo **số lượt thuê xe trong giờ tiếp theo**. Đây là bài toán hồi quy, vì vậy sử dụng `RandomForestRegressor`. Nếu dữ liệu chỉ tổng hợp theo ngày, có thể chuyển sang dự báo số lượt thuê trong ngày tiếp theo.

**1. Xác định bài toán và dữ liệu**

Trước tiên, thống nhất loại xe, phạm vi địa điểm và khoảng thời gian dự báo. Với phiên bản đầu tiên, nên dự báo tổng số lượt thuê của một hệ thống, chưa chia theo từng điểm thuê.

Dữ liệu cần có:

| Nhóm dữ liệu | Nội dung |
|---|---|
| Thời gian | Ngày và giờ thuê xe |
| Nhu cầu thực tế | Số lượt thuê theo giờ hoặc thông tin từng giao dịch để tổng hợp |
| Lịch | Thứ trong tuần, cuối tuần, ngày lễ |
| Thời tiết nếu có | Nhiệt độ, độ ẩm, lượng mưa |
| Khả năng cung ứng nếu có | Số xe sẵn có, thời gian ngừng phục vụ |

Lưu ý: số lượt thuê ghi nhận phản ánh lượng thuê thực tế. Khi hết xe, con số này có thể thấp hơn nhu cầu của khách hàng.

**2. Triển khai theo các giai đoạn**

| Giai đoạn | Công việc chính | Sản phẩm đầu ra |
|---|---|---|
| 1. Thu thập và làm sạch | Đọc dữ liệu, chuẩn hóa thời gian, xử lý thiếu và trùng lặp, tổng hợp theo giờ | Bộ dữ liệu sạch |
| 2. Phân tích nhu cầu | Phân tích theo giờ, thứ, tháng; xác định giờ cao điểm và khác biệt giữa ngày thường với cuối tuần | Biểu đồ và nhận xét |
| 3. Tạo đặc trưng | Tạo đặc trưng lịch, số lượt thuê quá khứ và trung bình trượt | Bảng đầu vào `X` và nhãn `y` |
| 4. Chia dữ liệu | Chia tập huấn luyện, xác thực và kiểm tra theo thứ tự thời gian | Ba tập dữ liệu riêng |
| 5. Xây dựng mô hình | Tạo mô hình dự báo đơn giản để đối chiếu, sau đó huấn luyện Random Forest | Mô hình ban đầu |
| 6. Đánh giá và điều chỉnh | Đo sai số, phân tích giờ dự báo kém và lựa chọn tham số | Bảng đánh giá và mô hình đã điều chỉnh |
| 7. Hoàn thiện | Lưu mô hình, tạo chức năng dự báo và viết báo cáo | Chương trình, báo cáo và slide |

**3. Thiết kế đầu vào và nhãn**

Giả sử cần dự báo số lượt thuê ở giờ `t`, ngay trước khi giờ đó bắt đầu:

- **Nhãn `y`:** số lượt thuê trong giờ `t`.
- **Đặc trưng lịch:** giờ, thứ trong tuần, tháng, cuối tuần và ngày lễ của giờ `t`.
- **Đặc trưng quá khứ:** số lượt thuê ở giờ `t−1`, `t−24` và `t−168`.
- **Trung bình trượt:** trung bình số lượt thuê của 24 giờ hoặc 7 ngày trước đó.
- **Thời tiết:** chỉ sử dụng thông tin đã biết hoặc bản dự báo có sẵn tại thời điểm dự đoán.

Các đặc trưng quá khứ và trung bình trượt phải được tính từ dữ liệu **trước giờ cần dự báo**. Không dùng số lượt thuê của chính giờ đó hoặc dữ liệu tương lai.

**4. Huấn luyện và đánh giá đúng với dữ liệu thời gian**

Dự kiến chia dữ liệu theo thứ tự:

- **70% đầu:** huấn luyện.
- **15% tiếp theo:** xác thực và chọn tham số.
- **15% cuối:** kiểm tra cuối cùng.

Không chia ngẫu nhiên, vì mục tiêu là dùng quá khứ để dự báo tương lai. Khi điều chỉnh mô hình, có thể dùng `TimeSeriesSplit` trong phần dữ liệu phát triển, giữ riêng tập kiểm tra cuối.

Trước Random Forest, xây dựng dự báo đối chiếu: **lấy số lượt thuê cùng giờ của tuần trước làm dự báo**. Sau đó kiểm tra Random Forest có cải thiện được sai số hay không.

| Chỉ số | Ý nghĩa |
|---|---|
| MAE | Trung bình dự báo lệch bao nhiêu lượt thuê |
| RMSE | Nhấn mạnh các lần dự báo sai nhiều |
| R² | Chỉ số bổ sung để đánh giá khả năng giải thích biến động |

Ngoài điểm tổng thể, cần xem sai số trong giờ cao điểm, cuối tuần và các ngày có nhu cầu bất thường. Chưa nên đặt mục tiêu “độ chính xác 90%” cho bài toán này.

**5. Lịch thực hiện dự kiến**

| Tuần | Nội dung |
|---|---|
| Tuần 1 | Chốt bài toán, thu thập, làm sạch và khảo sát dữ liệu |
| Tuần 2 | Tạo đặc trưng, chia dữ liệu theo thời gian, xây dựng dự báo đối chiếu |
| Tuần 3 | Huấn luyện Random Forest, điều chỉnh tham số và phân tích sai số |
| Tuần 4 | Hoàn thiện chương trình dự báo, viết báo cáo và chuẩn bị thuyết trình |
