# 💻 HƯỚNG DẪN & QUY CHUẨN PHÁT TRIỂN REPOSITORY `frontend`
## DÀNH CHO DEV PHÁT TRIỂN GIAO DIỆN ANGULAR 17+ & UI-KIT

---

## 🌿 1. QUY ĐỊNH GIT FLOW & NHÁNH LÀM VIỆC (BRANCHING RULES)

### 1.1. Cú pháp đặt tên nhánh (Checkout từ nhánh `dev`)
Tất cả các nhánh làm việc bắt buộc phải được **checkout từ nhánh `dev`**:

* **Task tính năng / Giao diện mới (Feature):**
  $$\mathbf{feature/\{\text{tên\_dev}\}/\{\text{mã\_task}\}}$$
  *Ví dụ:* `feature/luc/S2-07`, `feature/bui_toan/S2-08`, `feature/nguyen_toan/S2-12`, `feature/tung/S2-13`
* **Task sửa lỗi giao diện / Logic FE (Fix Bug):**
  $$\mathbf{fixbug/\{\text{tên\_dev}\}/\{\text{mã\_task}\}} \quad \text{hoặc} \quad \mathbf{fixbug/\{\text{tên\_dev}\}/\{\text{mã\_bug}\}}$$
  *Ví dụ:* `fixbug/luc/S2-07`, `fixbug/bui_toan/S2-BUG-04`
* **Tối ưu / Refactor:**
  $$\mathbf{refactor/\{\text{tên\_dev}\}/\{\text{mã\_task}\}}$$

---

### 1.2. Quy định Nhánh đích khi tạo Pull Request (Target Branch)
> [!IMPORTANT]
> **Nhánh đích khi tạo PR:** 👉 **`dev-2`** *(Merge vào nhánh làm việc tập trung của Sprint 2)*  
> **Quy trình:** Sau khi toàn bộ các màn hình FE của Sprint 2 được ghép API và vượt qua kiểm thử UI/UX, Tech Lead sẽ thực hiện merge nhánh `dev-2` $\rightarrow$ `dev`.

---

### 1.3. Quy tắc Commit Message (Conventional Commits)
- **Cú pháp:** `feat(mã_task): mô tả` hoặc `fix(mã_task): mô tả`
- *Ví dụ:*
  - `feat(S2-07): create Supplier list, search and modal create/edit form`
  - `feat(S2-08): build PurchaseOrder wizard form with dynamic FormArray for items`
  - `feat(S2-12): integrate Supplier frontend with backend REST APIs`
  - `fix(S2-08): fix auto calculation of line total and grand total on PO form`

---

## 🌟 2. MÀN HÌNH MẪU CHUẨN (GOLD REFERENCE SCREEN)

Toàn bộ các màn hình tính năng (Danh sách, Tìm kiếm, Thêm/Sửa, Chi tiết, Modal) **bắt buộc phải tham khảo và tuân thủ theo phong cách tổ chức mã nguồn của màn hình mẫu**:

👉 **Thư mục mẫu:** [`src/app/features/system/users`](file:///c:/ERP-UTT/frontend/src/app/features/system/users)

| File mẫu | Vai trò & Điểm cần học tập |
| :--- | :--- |
| [`user.model.ts`](file:///c:/ERP-UTT/frontend/src/app/features/system/users/user.model.ts) | Định nghĩa Type Interface rõ ràng, Enums, Meta status badge helper (`getUserStatusMeta`), Options cho Select. |
| [`user.service.ts`](file:///c:/ERP-UTT/frontend/src/app/features/system/users/user.service.ts) | Tách riêng tầng gọi API / Mock data, trả về `Observable<...>`, xử lý filter/phân trang/lỗi. |
| [`user-list.component.ts`](file:///c:/ERP-UTT/frontend/src/app/features/system/users/user-list.component.ts) | Kế thừa `BaseComponent`, Standalone Component, Angular Signals (`signal<User[]>`), Reactive Forms (`FormGroup`), RxJS cleanup bằng `takeUntil(this.destroy$)`, quản lý state Modal. |
| [`user-list.component.html`](file:///c:/ERP-UTT/frontend/src/app/features/system/users/user-list.component.html) | Layout chuẩn với Card, Toolbar Header, Search filter, Table, Pagination, Modal Drawer form, Popconfirm xóa. |
| [`user-list.component.scss`](file:///c:/ERP-UTT/frontend/src/app/features/system/users/user-list.component.scss) | Bố cục CSS chuẩn, sử dụng Design Tokens và Responsive Layout. |

---

## 🧩 3. BỘ UI-KIT & SHARED COMPONENTS BẮT BUỘC SỬ DỤNG

Tuyệt đối **không tự code lại** các thành phần UI nền tảng. Phải sử dụng các component có sẵn trong `src/app/shared/`:

| Component / Directive | Mục đích & Cách sử dụng |
| :--- | :--- |
| `<app-breadcrumbs>` | Hiển thị thanh điều hướng breadcrumb đồng bộ trên đầu mỗi trang. |
| `<app-button>` | Nút bấm chuẩn hệ thống: hỗ trợ `btnType="primary" \| "default" \| "danger"`, tích hợp sẵn `[loading]="isSaving()"`. |
| `<app-table-search-input>` | Ô tìm kiếm nhanh với icon search và debounce tối ưu cho bảng dữ liệu. |
| `<app-pagination>` | Thanh phân trang chuẩn: chọn số dòng/trang (`10, 20, 50, 100`) và chuyển trang. |
| `<app-modal>` | Khung Modal popup chuẩn kích thước, title, footer và animation. |
| `<app-selection-bar>` | Thanh công cụ nổi hiển thị số lượng bản ghi được chọn khi thao tác hàng loạt. |
| `EnterAsTabContainerDirective` | Gắn vào Form container để người dùng ấn phím **Enter** tự động chuyển sang ô input tiếp theo (tối ưu tốc độ nhập liệu). |
| `HasSomeAuthorityDirective` | Phân quyền hiển thị: `*hasSomeAuthority="[ROLE.PROC_PO_APPROVE]"` để ẩn/hiện nút phê duyệt. |

---

## 🛠 4. QUY CHUẨN CODE TYPESCRIPT, FORMS & UX

### 4.1. Cấu trúc thư mục một Feature
```
src/app/features/procurement/
├── suppliers/
│   ├── components/                 (Tách component con nếu modal/drawer phức tạp)
│   │   └── supplier-form-modal/
│   ├── supplier-list.component.ts
│   ├── supplier-list.component.html
│   ├── supplier-list.component.scss
│   ├── supplier.model.ts
│   ├── supplier.service.ts
│   └── suppliers.routes.ts
└── purchase-orders/
    ├── components/
    │   ├── po-item-table/          (Bảng động thêm NVL cho PO)
    │   └── po-print-preview/       (Màn hình xem trước bản in PO)
    ├── po-list.component.ts
    ├── po-form.component.ts
    ├── po.model.ts
    ├── po.service.ts
    └── purchase-orders.routes.ts
```

### 4.2. Quy tắc Code TypeScript & Quản lý State
1. **Standalone Components:** 100% component là `standalone: true`, import chính xác các module cần thiết (tránh import thừa).
2. **Kế thừa `BaseComponent`:** Mọi component kế thừa `BaseComponent` để tận dụng cơ chế dọn dẹp bộ nhớ:
   ```typescript
   this.supplierService.getAll(filter)
     .pipe(takeUntil(this.destroy$))
     .subscribe({ ... });
   ```
3. **Sử dụng Angular Signals:** Dùng `signal()` cho local state (`loading = signal(false)`, `suppliers = signal<Supplier[]>([])`).
4. **Typed Reactive Forms:**
   - Sử dụng `FormGroup`, `FormControl`, `FormArray` (đặc biệt cho bảng chi tiết dòng NVL của Đơn đặt hàng PO).
   - Kiểm tra `invalid && (dirty || touched)` để hiển thị lỗi màu đỏ trực quan dưới từng field (`field-error`).
   - Tự động tính toán thành tiền: `Thành tiền = Số lượng x Đơn giá` và `Tổng tiền đơn hàng = Tổng các dòng` theo thời gian thực (Real-time).

### 4.3. Quy tắc Trải nghiệm người dùng (UX Standards)
- **Loading State:** Khi đang gọi API lấy dữ liệu hoặc lưu dữ liệu, nút bấm hoặc bảng phải có trạng thái loading (`[nzLoading]="true"`).
- **Thông báo Toast:** Mọi thao tác Thêm, Sửa, Xóa, Phê duyệt, Hủy đơn thành công hoặc thất bại **phải hiển thị thông báo rõ ràng** qua `NzMessageService` / `NzNotificationService`.
- **Xác nhận thao tác nhạy cảm:** Hành động Xóa hoặc Hủy đơn **bắt buộc phải có `nz-popconfirm` hoặc Confirm Modal** cảnh báo trước khi thực hiện.

---

## 🛡 5. QUY ĐỊNH TẠO PULL REQUEST & CODE REVIEW

### 5.1. Reviewer bắt buộc
Khi tạo Pull Request, Dev **bắt buộc gán Reviewer**:
- 👤 `hoangdinhdung05`
- 👤 `Hoàn`

---

### 5.2. Mẫu PR Description (PR Template)
```markdown
### 📌 [MÃ TASK] - TÊN MÀN HÌNH / TÍNH NĂNG FRONTEND
- **Repo:** frontend
- **Nhánh:** `feature/tên_dev/mã_task` ➔ **Target:** `dev-2`
- **Tác giả:** [Tên Dev]
- **Reviewer:** @hoangdinhdung05, @hoan

---

### 📝 Chi tiết công việc thực hiện
- [x] Dựng màn hình danh sách và form theo đúng chuẩn màn mẫu `system/users`.
- [x] Sử dụng đầy đủ các component UI-KIT (`<app-button>`, `<app-pagination>`, `<app-modal>`,...).
- [x] Xử lý validate Reactive Form và tính toán tổng tiền thời gian thực.
- [x] Đã tích hợp API Backend / Mock service đầy đủ.

---

### 🧪 Bằng chứng kiểm thử (UI / Evidence)
- [x] Đã test responsive, giao diện hiển thị chuẩn đẹp, không vỡ layout (Đính kèm ảnh chụp màn hình UI / GIF demo).
- [x] Đã chạy `npm run build` thành công, không có lỗi TypeScript / Linter.

---

### ⚠️ Lưu ý Tích hợp (nếu có)
- [ ] Yêu cầu Backend chạy nhánh `dev-2` để test thông luồng API.
```

---

### 5.3. Điều kiện Tiên quyết để Merge (Definition of Done PR)
1. 🟢 Có **tối thiểu 01 Approval** từ `hoangdinhdung05` hoặc `Hoàn`.
2. 🟢 Resolve 100% review comments.
3. 🟢 Lệnh `npm run build` hoặc `ng build` thành công không có lỗi syntax/type.
4. 🟢 Không có xung đột (No merge conflict) với nhánh `dev-2`.
