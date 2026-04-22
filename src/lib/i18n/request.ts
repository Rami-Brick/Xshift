import { getRequestConfig } from 'next-intl/server';

const LOCALE = 'fr';

export default getRequestConfig(async () => {
  const messages = (await import(`../../../messages/${LOCALE}.json`)).default;

  return {
    locale: LOCALE,
    messages,
    timeZone: 'Africa/Tunis',
  };
});
