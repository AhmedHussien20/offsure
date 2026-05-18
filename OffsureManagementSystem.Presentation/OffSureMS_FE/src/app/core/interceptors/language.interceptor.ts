import { HttpInterceptorFn } from '@angular/common/http';

export const languageInterceptor: HttpInterceptorFn = (req, next) => {
  // Language switcher removed; keep API requests consistent.
  const lang = 'en';

  const langReq = req.clone({
    setHeaders: {
      'Accept-Language': lang
    }
  });

  return next(langReq);
};
