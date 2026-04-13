import { Eye, EyeOff } from 'lucide-react'
import SettingRow from '../../components/SettingRow'

interface AccountSettingsProps {
  passwordData: { oldPassword: string; newPassword: string; confirmPassword: string }
  setPasswordData: (data: any) => void
  showPasswords: { old: boolean; new: boolean; confirm: boolean }
  setShowPasswords: (data: any) => void
}

export default function AccountSettings({ passwordData, setPasswordData, showPasswords, setShowPasswords }: AccountSettingsProps) {
  return (
    <>
      <SettingRow label="Old Password" hint="Enter your current password.">
        <div className="password-input-wrapper">
          <input
            type={showPasswords.old ? 'text' : 'password'}
            className="form-control"
            value={passwordData.oldPassword}
            onChange={e => setPasswordData({ ...passwordData, oldPassword: e.target.value })}
            placeholder="Enter old password" />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowPasswords({ ...showPasswords, old: !showPasswords.old })}
            tabIndex={-1}
            aria-label="Toggle password visibility"
          >
            {showPasswords.old ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </SettingRow>

      <SettingRow label="New Password" hint="New password must be at least 6 characters.">
        <div className="password-input-wrapper">
          <input
            type={showPasswords.new ? 'text' : 'password'}
            className="form-control"
            value={passwordData.newPassword}
            onChange={e => setPasswordData({ ...passwordData, newPassword: e.target.value })}
            placeholder="Enter new password" />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
            tabIndex={-1}
            aria-label="Toggle password visibility"
          >
            {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </SettingRow>

      <SettingRow label="Confirm New Password" hint="Re-enter your new password to confirm." noBorder>
        <div className="password-input-wrapper">
          <input
            type={showPasswords.confirm ? 'text' : 'password'}
            className="form-control"
            value={passwordData.confirmPassword}
            onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            placeholder="Confirm new password" />
          <button
            type="button"
            className="password-toggle-btn"
            onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
            tabIndex={-1}
            aria-label="Toggle password visibility"
          >
            {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
      </SettingRow>
    </>
  )
}