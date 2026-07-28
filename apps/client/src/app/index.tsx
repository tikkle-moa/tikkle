import { RouterProvider } from "react-router";

import { router } from "./router";
import "./styles/global.css";
import "./styles/tailwind.css";

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;
