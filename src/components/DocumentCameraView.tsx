import React from "react";
import {
  requireNativeComponent,
  ViewProps,
  StyleSheet,
  View,
} from "react-native";

export interface DocumentCameraViewProps extends ViewProps {
  enableFlash?: boolean;
}

const NativeCameraView =
  requireNativeComponent<DocumentCameraViewProps>("DocumentCameraView");

export const DocumentCameraView = React.memo<DocumentCameraViewProps>(
  ({ style, enableFlash = false, ...props }) => {
    return (
      <View style={[styles.container, style]}>
        <NativeCameraView
          style={StyleSheet.absoluteFill}
          enableFlash={enableFlash}
          {...props}
        />
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
    backgroundColor: "#000000",
  },
});
