/**
 * Đường kẻ dùng chung cho các bảng số liệu, hai cấp để nhìn ra khối.
 * Kẻ đậm: giữa các ô dữ liệu, giữa các dòng nhân sự, đáy header và mép cột thông tin.
 * Kẻ nhạt: giữa các ô cùng một khối, như Vào với Ra của một ngày, Sáng với Chiều của một người,
 * cột Nhân sự với cột Bộ phận, nhãn nhóm cột với các cột con.
 */
export const LINE_RIGHT = 'border-r border-r-foreground/20'
export const LINE_BOTTOM = 'border-b border-b-foreground/20'
export const SOFT_RIGHT = 'border-r'
export const SOFT_BOTTOM = 'border-b'
/** Cột Nhân sự: kẻ nhạt với cột Bộ phận bên cạnh, kẻ đậm khi cột Bộ phận bị ẩn ở màn hẹp. */
export const PERSON_RIGHT = 'border-r border-r-foreground/20 md:border-r-border'
