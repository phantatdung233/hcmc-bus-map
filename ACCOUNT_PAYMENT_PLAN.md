# Ke hoach MVP: Nap tien va mua ve xe buyt

Ngay cap nhat: 2026-03-17
Muc tieu: ban toi gian, chi can nap tien thanh cong va mua ve xe buyt thanh cong.

## 1. Pham vi MVP

- Co tai khoan dang nhap.
- Co vi so du.
- Co nap tien qua 1 cong thanh toan (phan nap tien khong can hoat dong that chi can hien ma qr tuong trung sau do quet va cong tien vào vi).
- Co mua ve xe buyt bang so du vi.
- Co lich su giao dich co ban.

Khong lam trong MVP:

- Refund tu dong.
- Voucher, subscription, invoice.
- Nhieu cong thanh toan cung luc.

## 2. Data model toi thieu

### 2.1 users

- id
- email
- password_hash
- created_at

### 2.2 wallets

- id
- user_id (unique)
- balance (VND)
- updated_at

### 2.3 transactions

- id
- user_id
- type (topup, buy_ticket)
- amount
- status (pending, success, failed)
- provider_order_id (cho topup)
- note
- created_at

### 2.4 bus_tickets

- id
- user_id
- route_id
- ticket_code
- price
- status (active, used, expired)
- created_at

## 3. API can co

Auth:

- POST /auth/register
- POST /auth/login
- GET /auth/me

Wallet:

- GET /wallet/balance
- GET /wallet/transactions

Nap tien:

- POST /payments/topup/create
- POST /payments/webhook
- GET /payments/topup/:id/status

Mua ve:

- POST /tickets/buy
- GET /tickets/my

## 4. Luong nghiep vu chinh

### 4.1 Nap tien

1. Nguoi dung nhap so tien nap.
2. Server tao transaction pending va tao link thanh toan.
3. Nguoi dung thanh toan tren cong thanh toan.
4. Webhook bao thanh cong -> server cap nhat transaction success.
5. Server cong tien vao wallet.

### 4.2 Mua ve xe buyt

1. Nguoi dung chon tuyen/loai ve.
2. Client goi POST /tickets/buy.
3. Server kiem tra so du vi.
4. Neu du tien: tru tien, tao transaction buy_ticket success, tao bus_ticket.
5. Tra ve ma ve cho nguoi dung.

## 5. UI can lam

- Trang Dang nhap/Dang ky.
- Trang Vi cua toi:
  - So du hien tai
  - Nut Nap tien
  - Lich su giao dich
- Trang Mua ve:
  - Chon tuyen
  - Hien gia ve
  - Nut Mua ve
- Trang Ve cua toi:
  - Danh sach ve da mua
  - Ma ve
  - Trang thai ve

## 6. Dieu kien thanh cong MVP

- Nap tien thanh cong thi so du tang dung.
- Mua ve thanh cong thi so du giam dung va tao ma ve.
- Khong du tien thi khong mua duoc ve.
- Nguoi dung xem duoc lich su nap tien va mua ve.

## 7. Ke hoach trien khai ngan (3 giai doan)

### Giai doan 1: Nen tang

- Auth + users
- Wallet + balance
- UI dang nhap va vi co ban

### Giai doan 2: Nap tien

- Tich hop 1 cong thanh toan
- Tao topup order + webhook
- Cap nhat so du khi thanh cong

### Giai doan 3: Mua ve

- API /tickets/buy
- Tru tien tu vi va tao ve
- UI mua ve + danh sach ve cua toi

## 8. Test toi thieu

- Test nap tien thanh cong.
- Test mua ve khi du so du.
- Test mua ve khi thieu so du.
- Test webhook bi goi lap (khong cong tien 2 lan).
