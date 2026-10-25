export default function SettingsBackupPanels({ t, busy, backupStatus, boardBackupStatus, backupFileInputRef, boardBackupFileInputRef, handleExportBackup, handleExportBoardBackup, handleRestoreBoardBackup, handleRestoreBackup }) {
  return (
        <div className="settings-action-stack">
        <section className="settings-panel settings-backup-panel">
          <div className="settings-panel-header">
            <p className="module-label">{t.settings.backupLabel}</p>
            <h3>{t.settings.backupTitle}</h3>
          </div>
          <div className="backup-actions">
            <button
              className="settings-option"
              type="button"
              disabled={busy}
              onClick={handleExportBackup}
            >
              {t.settings.exportBackup}
            </button>
            <button
              className="settings-option"
              type="button"
              disabled={busy}
              onClick={() => backupFileInputRef.current?.click()}
            >
              {t.settings.importBackup}
            </button>
          </div>
          <input
            ref={backupFileInputRef}
            className="backup-file-input"
            type="file"
            disabled={busy}
            accept="application/json,.json"
            aria-label={t.settings.importBackup}
            onChange={handleRestoreBackup}
          />
          <p className="settings-note">{t.settings.backupNote}</p>
          <p className="settings-note">{t.settings.mapBackupNote}</p>
          {backupStatus ? (
            <p className={`backup-status is-${backupStatus.type}`}>
              {backupStatus.message}
            </p>
          ) : null}
        </section>

        <section className="settings-panel settings-board-backup-panel">
          <div className="settings-panel-header">
            <p className="module-label">{t.settings.backupLabel}</p>
            <h3>{t.settings.boardBackupTitle}</h3>
          </div>
          <div className="backup-actions">
            <button
              className="settings-option"
              type="button"
              disabled={busy}
              onClick={handleExportBoardBackup}
            >
              {t.settings.exportBoardBackup}
            </button>
            <button
              className="settings-option"
              type="button"
              disabled={busy}
              onClick={() => boardBackupFileInputRef.current?.click()}
            >
              {t.settings.importBoardBackup}
            </button>
          </div>
          <input
            ref={boardBackupFileInputRef}
            className="backup-file-input"
            type="file"
            disabled={busy}
            accept="application/json,.json"
            aria-label={t.settings.importBoardBackup}
            onChange={handleRestoreBoardBackup}
          />
          <p className="settings-note">{t.settings.boardBackupNote}</p>
          {boardBackupStatus ? (
            <p className={`backup-status is-${boardBackupStatus.type}`}>
              {boardBackupStatus.message}
            </p>
          ) : null}
        </section>

        </div>
  )
}
