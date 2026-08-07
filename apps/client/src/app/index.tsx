import { RouterProvider } from "react-router";

import { useSessionInitializer } from "./model/use-session-initializer";
import { router } from "./router";
import "./styles/global.css";
import "./styles/tailwind.css";

const App = () => {
  useSessionInitializer();

  return <RouterProvider router={router} />;
};

export default App;
