export interface BaseResponse<T>{
    data: T;
    message: string;
    status_Code: Number;
    errorList: string[];
    success: boolean;
    errorCode?: string;
}