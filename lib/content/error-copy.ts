import { site } from "@/content/site";

/** Strings for the client-side error boundary, which cannot use the server-only loader. */
export const errorCopy = {
  metaTitle: site.ui.metaErrorTitle,
  title: site.ui.errorTitle,
  body: site.ui.errorBody,
  retry: site.ui.errorRetry,
  home: site.ui.errorHome,
};
