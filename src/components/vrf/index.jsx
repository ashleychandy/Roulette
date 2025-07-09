import VrfRecoveryModal from "./VrfRecoveryModal";
import VrfStatusGlobal from "./VrfStatusGlobal";

// Export individual components
export { VrfRecoveryModal, VrfStatusGlobal };

// Export a default component that includes both the status and recovery components
const VrfComponents = ({ onOpenRecovery }) => {
  return (
    <>
      <VrfStatusGlobal onOpenRecovery={onOpenRecovery} />
    </>
  );
};

export default VrfComponents;
