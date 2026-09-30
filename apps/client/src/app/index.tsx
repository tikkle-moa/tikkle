import { RouterProvider } from "react-router";

import Providers from "./providers";
import { router } from "./router";
import "./styles/global.css";
import "./styles/tailwind.css";

const App = () => {
  return (
    <Providers>
      <RouterProvider router={router} />
    </Providers>
  );
};

export default App;
