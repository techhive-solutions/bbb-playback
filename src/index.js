import Loader from "components/loader";
import Router from "components/router";
import { getLocale, getMessages } from "locales";
import { createRoot } from "react-dom/client";
import { IntlProvider } from "react-intl";
import { ROUTER } from "utils/constants";
import { getStyle } from "utils/params";
import "./index.scss";

const locale = getLocale();
const style = getStyle();

const root = createRoot(document.getElementById("root"));

root.render(
  <IntlProvider locale={locale} messages={getMessages(locale)}>
    {style ? <link rel="stylesheet" type="text/css" href={style} /> : null}
    {ROUTER ? <Router /> : <Loader />}
  </IntlProvider>
);
