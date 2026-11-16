/** Một trang dữ liệu do BE cắt sẵn. `page` là trang BE thực trả (đã lùi về trang cuối nếu vượt). */
export interface Paginated<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

export function pageCountOf(data: Pick<Paginated<unknown>, 'total' | 'pageSize'> | undefined): number {
  if (!data || data.total === 0) return 1
  return Math.ceil(data.total / data.pageSize)
}
