import React from "react";
import { UpgradeMessage } from "./tool-error-ui";
import { findToolErrorComponent, ToolErrorPayload } from "./tool-error-ui/tool-error-registry";

interface ToolErrorEventProps {
  payload?: ToolErrorPayload;
  openUpgradeModal?: () => void;
}

const ToolErrorEvent: React.FC<ToolErrorEventProps> = ({ payload, openUpgradeModal }) => {
  if (!payload) return null;

  const { isUpgradeErrorMessage } = payload;

  // Always show upgrade message if it's an upgrade error
  if (isUpgradeErrorMessage) {
    return <UpgradeMessage openUpgradeModal={openUpgradeModal} />;
  }

  // Find the appropriate component using the registry
  const ErrorComponent = findToolErrorComponent(payload);
  
  // Render the appropriate component
  return <ErrorComponent payload={payload} />;
};

export default ToolErrorEvent; 