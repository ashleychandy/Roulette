import React from "react";
import { motion } from "framer-motion";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faExclamationCircle,
  faInfoCircle,
  faExclamationTriangle,
  faTimes,
} from "@fortawesome/free-solid-svg-icons";

const Toast = ({ id, title, description, type = "info", onClose }) => {
  // Get the appropriate icon and colors based on the toast type
  const getToastStyles = () => {
    switch (type) {
      case "success":
        return {
          icon: faCheckCircle,
          bgColor: "bg-gaming-success/20",
          borderColor: "border-gaming-success/50",
          iconBgColor: "bg-gaming-success/30",
          iconColor: "text-gaming-success",
        };
      case "error":
        return {
          icon: faExclamationCircle,
          bgColor: "bg-gaming-error/20",
          borderColor: "border-gaming-error/50",
          iconBgColor: "bg-gaming-error/30",
          iconColor: "text-gaming-error",
        };
      case "warning":
        return {
          icon: faExclamationTriangle,
          bgColor: "bg-gaming-warning/20",
          borderColor: "border-gaming-warning/50",
          iconBgColor: "bg-gaming-warning/30",
          iconColor: "text-gaming-warning",
        };
      case "info":
      default:
        return {
          icon: faInfoCircle,
          bgColor: "bg-gaming-info/20",
          borderColor: "border-gaming-info/50",
          iconBgColor: "bg-gaming-info/30",
          iconColor: "text-gaming-info",
        };
    }
  };

  const { icon, bgColor, borderColor, iconBgColor, iconColor } =
    getToastStyles();

  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 50 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-4 right-4 max-w-md w-full mx-4 p-4 rounded-xl shadow-xl 
                 backdrop-blur-md border transition-all duration-300 z-50
                 ${bgColor} ${borderColor}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${iconBgColor}`}>
            <FontAwesomeIcon icon={icon} className={`${iconColor}`} />
          </div>
          <div>
            {title && (
              <p className="text-white font-medium text-shadow">{title}</p>
            )}
            {description && (
              <p className="text-white/80 text-sm">{description}</p>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-white/80 hover:text-white transition-colors"
        >
          <FontAwesomeIcon icon={faTimes} />
        </button>
      </div>
    </motion.div>
  );
};

export default Toast;
