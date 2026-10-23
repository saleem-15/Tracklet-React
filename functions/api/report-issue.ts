import handler from '../../api/report-issue';

export interface PagesContext {
  request: Request;
  env: Record<string, string>;
  waitUntil: (promise: Promise<any>) => void;
  next: () => Promise<Response>;
}

export const onRequest = async (context: PagesContext) => {
  return handler(
    context.request,
    null,
    context.env,
    context.waitUntil ? context.waitUntil.bind(context) : undefined
  );
};
