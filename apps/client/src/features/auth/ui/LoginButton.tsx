import { Link } from "react-router";

import { ROUTE_PATHS } from "../../../shared/config/router.config";

const LoginButton = () => {
  return (
    <Link
      className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
      to={ROUTE_PATHS.LOGIN}
    >
      로그인
    </Link>
  );
};

export default LoginButton;
