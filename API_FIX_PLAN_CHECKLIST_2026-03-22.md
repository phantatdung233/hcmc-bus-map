# API Fix Plan Checklist - 2026-03-22

## Mục tiêu
Fix toàn bộ lỗi được nêu trong báo cáo QA tại [API_QA_REPORT_2026-03-22.md](API_QA_REPORT_2026-03-22.md), đảm bảo:
- Luồng nạp tiền chính xác, không mất tiền, không sai trạng thái.
- API bảo mật theo session thực, không bypass bằng header giả.
- Endpoint nhất quán, dễ bảo trì.

## Phạm vi lỗi cần fix
- F1 (CRITICAL): Topup success non-atomic, ví không cộng tiền.
- F2 (HIGH): Topup status lộ dữ liệu khi chưa auth.
- F3 (HIGH): Có thể bypass auth bằng x-user-id.
- F4 (MEDIUM): Confirm redirect error dù trạng thái đơn có thể đã success.
- F5 (LOW): Trùng endpoint ticket list.

## Checklist triển khai theo ưu tiên

### P0 - Must Fix Ngay

#### 1) Fix F1: lỗi credit ví trong markTopupSuccess
- [x] Sửa update wallet tại [src/lib/user-store.ts](src/lib/user-store.ts): bỏ balance khỏi $setOnInsert, chỉ giữ $inc cho balance.
- [x] Đảm bảo upsert wallet không tạo conflict update path.
- [x] Viết unit/integration check cho case: order pending -> success thì balance tăng đúng amount.
- [x] Verify lại response confirm không còn redirect error vì conflict.

#### 2) Fix F1 + F4: bọc transaction cho topup success flow
- [x] Dùng Mongo session transaction trong [src/lib/user-store.ts](src/lib/user-store.ts) cho 3 bước:
  - [x] update topup_orders.status
  - [x] update transactions.status/note
  - [x] update wallets.balance
- [x] Thiết kế idempotent cho markTopupSuccess:
  - [x] Nếu order đã success thì return success ngay, không cộng tiền lần 2.
- [x] Trong [src/app/api/payments/topup/confirm/route.ts](src/app/api/payments/topup/confirm/route.ts), chỉ redirect success khi transaction commit hoàn tất.
- [x] Chuẩn hóa redirect lỗi: thông điệp rõ ràng, không mơ hồ partial success.

#### 3) Fix F3: đóng bypass auth bằng x-user-id
- [x] Xóa fallback legacy x-user-id trong [src/lib/server-auth.ts](src/lib/server-auth.ts).
- [x] Chỉ chấp nhận session cookie hợp lệ.
- [x] Re-test tất cả API protected để xác nhận:
  - [x] Không cookie + có x-user-id => 401.
  - [x] Cookie hợp lệ => 200.

### P1 - High Priority

#### 4) Fix F2: bảo vệ endpoint topup status
- [x] Thêm auth check trong [src/app/api/payments/topup/[id]/status/route.ts](src/app/api/payments/topup/[id]/status/route.ts).
- [x] Thêm ownership check: chỉ user sở hữu order mới được xem status.
- [x] Chuẩn hóa status code:
  - [x] Chưa đăng nhập => 401.
  - [x] Không phải owner => 403.
  - [x] Không tồn tại order => 404.

#### 5) Regression tests cho security + topup
- [x] Mở rộng [scripts/qa-api-test.mjs](scripts/qa-api-test.mjs) với assert bắt buộc:
  - [x] Confirm topup phải redirect success/already_paid đúng logic.
  - [x] Wallet tăng tiền sau confirm đúng amount.
  - [x] Header-only bypass luôn fail (401/403).
  - [x] Topup status không trả data cho user không hợp lệ.
- [x] Thêm script CI command trong [package.json](package.json): qa:api.
- [ ] Đặt rule: merge blocked nếu qa:api fail.

### P2 - Tối ưu bảo trì

#### 6) Fix F5: hợp nhất endpoint trùng lặp
- [x] Chọn endpoint chuẩn: ưu tiên [src/app/api/tickets/my/route.ts](src/app/api/tickets/my/route.ts) hoặc [src/app/api/my-tickets/route.ts](src/app/api/my-tickets/route.ts).
- [x] Endpoint còn lại chuyển sang:
  - [x] Redirect nội bộ, hoặc
  - [ ] Giữ tạm với note deprecated + timeline remove.
- [x] Cập nhật frontend gọi về endpoint canonical duy nhất.
- [x] Cập nhật tài liệu API.

## Checklist xác nhận hoàn tất (Definition of Done)
- [x] Chạy lại test QA: `node scripts/qa-api-test.mjs` và pass 100%.
- [x] Chạy build production: `npm run build` pass.
- [ ] Manual smoke test topup end-to-end:
  - [ ] Tạo lệnh nạp
  - [ ] Confirm
  - [ ] Ví tăng số dư
  - [ ] Mua vé thành công
- [x] Không còn endpoint protected nào truy cập được khi thiếu session cookie.
- [ ] Báo cáo QA được cập nhật thành trạng thái Fixed/Closed cho F1-F5.

## Kế hoạch thực thi đề xuất
- Phase 1 (P0): F1 + F3 + F4
- Phase 2 (P1): F2 + regression automation
- Phase 3 (P2): hợp nhất endpoint trùng

## Ghi chú rủi ro
- Thay đổi auth có thể ảnh hưởng client cũ còn dùng x-user-id.
- Transaction Mongo yêu cầu môi trường DB hỗ trợ transaction đúng cấu hình.
- Khi migration endpoint ticket, cần theo dõi backward compatibility cho frontend/app tích hợp ngoài.
