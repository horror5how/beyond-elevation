import { Composition } from "remotion";
import { ElonIPVideo } from "./ElonIPVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="ElonIPVideo"
        component={ElonIPVideo}
        durationInFrames={300}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          title: "How IP Drives AI Company Valuations",
          subtitle: "Beyond Elevation — IP Strategy & Licensing",
        }}
      />
    </>
  );
};
