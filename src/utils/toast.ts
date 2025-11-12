import { toast } from "sonner";

export const showSuccess = (message: string, description?: string) => {
  toast.success(description ? `${message}: ${description}` : message);
};

export const showError = (message: string, description?: string) => {
  toast.error(description ? `${message}: ${description}` : message);
};

export const showLoading = (message: string) => {
  return toast.loading(message);
};

export const dismissToast = (toastId: string) => {
  toast.dismiss(toastId);
};