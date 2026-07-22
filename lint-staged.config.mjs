import path from "node:path";

const quote = (value) => `"${value.replaceAll('"', '\\"')}"`;

export default {
  "apps/client/**/*.{js,jsx,ts,tsx,json,css,md}": (files) => {
    const relativeFiles = files.map((file) =>
      quote(path.relative("apps/client", file)),
    );

    return `pnpm --dir apps/client exec prettier --write ${relativeFiles.join(" ")}`;
  },

  "apps/server/**/*.{kt,kts}": () =>
    "apps/server/gradlew -p apps/server ktlintFormat",
};
