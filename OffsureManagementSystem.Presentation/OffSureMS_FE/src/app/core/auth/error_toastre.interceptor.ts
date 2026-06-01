import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { ToastrService } from 'ngx-toastr';
import { catchError, tap } from 'rxjs/operators';
import { throwError } from 'rxjs';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toastr = inject(ToastrService);

  return next(req).pipe(
    tap({
      next: (event: any) => {
        if (event?.body?.success === false) {
          const message = event.body?.message || 'Error occurred. Please try again.';
          toastr.error(message, 'Error', {
            timeOut: 3000,
            positionClass: 'toast-top-right'
          });
        }
      }
    }),
    catchError((err: any) => {
      // 401 is handled by AuthInterceptor (refresh + session logout toast).
      if (err?.status !== 401) {
        const message = err?.error?.message || 'Error occurred. Please try again.';
        toastr.error(message, 'Error', {
          timeOut: 3000,
          positionClass: 'toast-top-right'
        });
      }
      return throwError(() => err);
    })
  );
};
