"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertCircle,
  CheckCircle2,
  MapPin,
  Phone,
  Mail,
  Globe,
  User,
  Lock,
  Building2,
  Upload,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useBusiness } from "@/context/BusinessContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SettingsPage() {
  const { business, setBusiness } = useBusiness();
  const supabase = createClient();

  const [settings, setSettings] = useState({
    business_name: "",
    business_type: "",
    location: "",
    contact_email: "",
    contact_phone: "",
    contact_person_name: "",
    contact_position: "",
    admin_username: "",
    admin_password: "",
    business_logo: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<"company" | "admin">("company");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");

  // Fetch business data on component mount
  useEffect(() => {
    if (business?.id) {
      fetchBusinessData();
    }
  }, [business]);

  const fetchBusinessData = async () => {
    if (!business?.id) return;

    setLoading(true);
    try {
      const { data, error: fetchError } = await supabase
        .from("businesses")
        .select("*")
        .eq("id", business.id)
        .single();

      if (fetchError) throw fetchError;

      if (data) {
        setSettings({
          business_name: data.business_name || "",
          business_type: data.business_type || "",
          location: data.location || "",
          contact_email: data.contact_email || "",
          contact_phone: data.contact_phone || "",
          contact_person_name: data.contact_person_name || "",
          contact_position: data.contact_position || "",
          admin_username: data.admin_username || "",
          admin_password: "", // Don't load password for security
          business_logo: data.business_logo || "",
        });
      }
    } catch (err: any) {
      console.error("Error fetching business data:", err);
      setError("Failed to load business data");
    } finally {
      setLoading(false);
    }
  };

  const uploadImageToCloudinary = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append(
      "upload_preset",
      process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || "",
    );
    formData.append("folder", `business-logos/${business?.id}`);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      return data.secure_url;
    } catch (err: any) {
      console.error("Upload error:", err);
      throw new Error("Failed to upload image to Cloudinary");
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        setError("Please upload an image file");
        return;
      }

      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError("File size must be less than 2MB");
        return;
      }

      setLogoFile(file);
      const previewUrl = URL.createObjectURL(file);
      setLogoPreview(previewUrl);
      setError("");
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview("");
    setSettings((prev) => ({ ...prev, business_logo: "" }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSettings((prev) => ({
      ...prev,
      [name]: value,
    }));
    setIsSaved(false);
    setError("");
  };

  const handleSave = async () => {
    if (!business?.id) return;

    setSaving(true);
    setError("");

    try {
      let logoUrl = settings.business_logo;

      // Upload new logo if selected
      if (logoFile) {
        setUploading(true);
        try {
          logoUrl = await uploadImageToCloudinary(logoFile);

          // Update settings state with new logo URL
          setSettings((prev) => ({ ...prev, business_logo: logoUrl }));
        } catch (uploadErr: any) {
          setError(uploadErr.message);
          setSaving(false);
          setUploading(false);
          return;
        }
        setUploading(false);
      }

      // Prepare update data
      const updateData: any = {
        business_name: settings.business_name,
        business_type: settings.business_type,
        location: settings.location,
        contact_email: settings.contact_email,
        contact_phone: settings.contact_phone,
        contact_person_name: settings.contact_person_name,
        contact_position: settings.contact_position,
        admin_username: settings.admin_username,
        business_logo: logoUrl,
        updated_at: new Date().toISOString(),
      };


      // Only update password if provided
      if (settings.admin_password) {
        updateData.admin_password = settings.admin_password;
      }

      // First, verify the business exists
      const { data: existingBusiness, error: checkError } = await supabase
        .from("businesses")
        .select("id")
        .eq("id", business.id)
        .single();

      if (checkError) {
        console.error("Business not found:", checkError);
        throw new Error("Business not found");
      }

      // Update business in database
      const { data: updatedData, error: updateError } = await supabase
        .from("businesses")
        .update(updateData)
        .eq("id", business.id)
        .select("*"); // Select all columns to get the updated data

      if (updateError) {
        console.error("Update error:", updateError);
        throw updateError;
      }


      // Get the updated data - it should be the first item in the array
      const updatedBusinessData =
        updatedData && updatedData[0] ? updatedData[0] : null;

      if (updatedBusinessData) {

        // Update context with new data
        const updatedBusiness = {
          ...business,
          business_name: updatedBusinessData.business_name,
          business_type: updatedBusinessData.business_type,
          location: updatedBusinessData.location,
          contact_email: updatedBusinessData.contact_email,
          contact_phone: updatedBusinessData.contact_phone,
          admin_username: updatedBusinessData.admin_username,
          business_logo: updatedBusinessData.business_logo,
        };
        setBusiness(updatedBusiness);

        // Also update local settings state
        setSettings((prev) => ({
          ...prev,
          business_logo: updatedBusinessData.business_logo || "",
        }));
      } else {
        // If no data returned, manually update the context with what we sent
        const updatedBusiness = {
          ...business,
          business_name: settings.business_name,
          business_type: settings.business_type,
          location: settings.location,
          contact_email: settings.contact_email,
          contact_phone: settings.contact_phone,
          admin_username: settings.admin_username,
          business_logo: logoUrl,
        };
        setBusiness(updatedBusiness);
      }

      // Clear password and logo file after save
      setSettings((prev) => ({ ...prev, admin_password: "" }));
      setLogoFile(null);
      setLogoPreview("");

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);

      // Refetch business data to confirm save
      await fetchBusinessData();
    } catch (err: any) {
      console.error("Error saving settings:", err);
      setError(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!business?.id) return;

    // Validate password
    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    setSaving(true);
    setPasswordError("");

    try {
      // Update password in database
      const { error: updateError } = await supabase
        .from("businesses")
        .update({ admin_password: newPassword })
        .eq("id", business.id);

      if (updateError) throw updateError;

      // Clear password fields
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordDialog(false);

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err: any) {
      console.error("Error updating password:", err);
      setPasswordError(err.message || "Failed to update password");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-100">Settings</h1>
        <p className="text-slate-400 mt-2">
          Manage your company information and account settings
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-red-300 font-medium">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {isSaved && (
        <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <p className="text-emerald-300 font-medium">
            Settings saved successfully!
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-700">
        <button
          onClick={() => setActiveTab("company")}
          className={`px-4 py-3 font-medium text-sm transition-colors ${
            activeTab === "company"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          Company Info
        </button>
        <button
          onClick={() => setActiveTab("admin")}
          className={`px-4 py-3 font-medium text-sm transition-colors ${
            activeTab === "admin"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-slate-400 hover:text-slate-300"
          }`}
        >
          Admin Account
        </button>
      </div>

      {/* Company Info Tab */}
      {activeTab === "company" && (
        <div className="space-y-6">
          {/* Company Logo Card */}
          <Card className="bg-slate-800/50 border-slate-700/50 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                Company Logo
              </h2>
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="relative w-32 h-32 bg-slate-700/50 rounded-lg border-2 border-slate-600 flex items-center justify-center overflow-hidden">
                  {logoPreview || settings.business_logo ? (
                    <>
                      <img
                        src={logoPreview || settings.business_logo}
                        alt="Business Logo"
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={removeLogo}
                        className="absolute top-1 right-1 p-1 bg-red-500 rounded-full hover:bg-red-600 transition-colors"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </>
                  ) : (
                    <Building2 className="w-12 h-12 text-slate-500" />
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <label className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                        disabled={uploading}
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          const fileInput = document.querySelector(
                            'input[type="file"]',
                          ) as HTMLInputElement;
                          if (fileInput) fileInput.click();
                        }}
                        disabled={uploading}
                        className="bg-slate-700 hover:bg-slate-600 text-slate-100"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        {uploading ? "Uploading..." : "Upload Logo"}
                      </Button>
                    </label>
                    {settings.business_logo && !logoFile && (
                      <Button
                        type="button"
                        onClick={removeLogo}
                        variant="outline"
                        className="border-red-600 text-red-400 hover:bg-red-950"
                      >
                        <X className="w-4 h-4 mr-2" />
                        Remove Logo
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-3">
                    Recommended size: 200x200px (PNG or JPG, max 2MB)
                  </p>
                  {logoFile && (
                    <p className="text-xs text-blue-400 mt-1">
                      New logo selected: {logoFile.name}
                    </p>
                  )}
                  {settings.business_logo && !logoFile && (
                    <p className="text-xs text-emerald-400 mt-1">
                      Current logo saved in database
                    </p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          {/* Company Details Card */}
          <Card className="bg-slate-800/50 border-slate-700/50 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                Company Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Business Name
                  </label>
                  <Input
                    type="text"
                    name="business_name"
                    value={settings.business_name}
                    onChange={handleInputChange}
                    className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Business Type
                  </label>
                  <Input
                    type="text"
                    name="business_type"
                    value={settings.business_type}
                    onChange={handleInputChange}
                    className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Location
                  </label>
                  <Input
                    type="text"
                    name="location"
                    value={settings.location}
                    onChange={handleInputChange}
                    className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500"
                    placeholder="City, Country"
                  />
                </div>
              </div>
            </div>
          </Card>

          {/* Contact Information Card */}
          <Card className="bg-slate-800/50 border-slate-700/50 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
                <Phone className="w-5 h-5 text-blue-400" />
                Contact Information
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Contact Person Name
                  </label>
                  <Input
                    type="text"
                    name="contact_person_name"
                    value={settings.contact_person_name}
                    onChange={handleInputChange}
                    className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Contact Position
                  </label>
                  <Input
                    type="text"
                    name="contact_position"
                    value={settings.contact_position}
                    onChange={handleInputChange}
                    className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email
                  </label>
                  <Input
                    type="email"
                    name="contact_email"
                    value={settings.contact_email}
                    onChange={handleInputChange}
                    className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Phone Number
                  </label>
                  <Input
                    type="tel"
                    name="contact_phone"
                    value={settings.contact_phone}
                    onChange={handleInputChange}
                    className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Admin Account Tab */}
      {activeTab === "admin" && (
        <div className="space-y-6">
          <Card className="bg-slate-800/50 border-slate-700/50 p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-100 mb-6 flex items-center gap-2">
                <User className="w-5 h-5 text-blue-400" />
                Admin Account Details
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Admin Username
                  </label>
                  <Input
                    type="text"
                    name="admin_username"
                    value={settings.admin_username}
                    onChange={handleInputChange}
                    className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Admin Password
                  </label>
                  <Input
                    type="password"
                    name="admin_password"
                    value={settings.admin_password}
                    onChange={handleInputChange}
                    placeholder="Enter new password to change"
                    className="bg-slate-700/50 border-slate-600 text-slate-100 placeholder-slate-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Leave blank to keep current password
                  </p>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-700/50 pt-6">
              <h3 className="text-sm font-semibold text-slate-100 mb-4">
                Security
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-600/50">
                  <div>
                    <p className="text-slate-200 font-medium">
                      Change Password
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Update your admin account password
                    </p>
                  </div>
                  <Button
                    onClick={() => setShowPasswordDialog(true)}
                    className="bg-slate-700 hover:bg-slate-600 text-slate-100"
                  >
                    Change
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end gap-4 pt-6 border-t border-slate-700/50">
        <Button
          variant="outline"
          onClick={fetchBusinessData}
          className="border-slate-600 text-slate-300 hover:bg-slate-800"
          disabled={saving || uploading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          disabled={saving || uploading}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {saving || uploading ? "Saving..." : "Save Changes"}
        </Button>
      </div>

      {/* Password Change Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="bg-slate-900 border-slate-700 text-slate-100">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription className="text-slate-400">
              Enter your new password below. Make sure it's at least 6
              characters long.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                New Password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirm Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
            {passwordError && (
              <p className="text-red-400 text-sm">{passwordError}</p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowPasswordDialog(false);
                setNewPassword("");
                setConfirmPassword("");
                setPasswordError("");
              }}
              className="border-slate-600 text-slate-300 hover:bg-slate-800"
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordChange}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saving ? "Updating..." : "Update Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
