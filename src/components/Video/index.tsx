import { Composition, registerRoot } from "remotion";
import { PromoVideo } from "./PromoVideo";

export const RemotionRoot = () => {
  return (
    <Composition
      id="PromoVideo"
      component={PromoVideo}
      durationInFrames={690}
      fps={30}
      width={1920}
      height={1080}
    />
  );
};

registerRoot(RemotionRoot);
