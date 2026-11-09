import handlePosthogProxy from '../../api/ingest';

export interface PagesContext {
  request: Request;
  env: Record<string, string>;
  waitUntil: (promise: Promise<any>) => void;
  next: () => Promise<Response>;
}

export const onRequest = async (context: PagesContext) => {
  return handlePosthogProxy(context.request, { env: context.env });
};
