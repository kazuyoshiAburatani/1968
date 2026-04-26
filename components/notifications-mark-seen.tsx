"use client";

import { useEffect } from "react";
import { markNotificationsSeen } from "@/app/notifications/actions";

// /notifications を開いた瞬間に既読化、once-per-mount。
export function NotificationsMarkSeen() {
  useEffect(() => {
    void markNotificationsSeen();
  }, []);
  return null;
}
