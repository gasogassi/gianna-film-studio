import React from "react";
import { registerRoot, Composition } from "remotion";
import { Film } from "./Film";
import type { Edit } from "./types";

// One composition per film; each reads its own EDL.
const films: Record<string, Edit> = {
  Ritorno: require("../film/ritorno/edit.json"),
};
try { films.Segreto = require("../film/segreto/edit.json"); } catch {}

const Root: React.FC = () =>
  React.createElement(React.Fragment, null,
    ...Object.entries(films).map(([id, e]) =>
      React.createElement(Composition, {
        key: id, id, component: Film as React.FC<any>,
        durationInFrames: Math.round(e.duration * e.fps), fps: e.fps, width: 1080, height: 1920, defaultProps: { edit: e },
      })));

registerRoot(Root);
