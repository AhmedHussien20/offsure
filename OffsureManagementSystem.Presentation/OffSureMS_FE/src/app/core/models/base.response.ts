export interface BaseResponse<T> {
  success: boolean;
  status_Code: number;
  message: string | null;
  data: T;
}
