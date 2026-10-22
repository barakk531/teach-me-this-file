import { useState } from 'react';
import { LessonScreen } from './components/lesson/LessonScreen.jsx';
import { SettingsDialog } from './components/SettingsDialog.jsx';
import { SetupScreen } from './components/setup/SetupScreen.jsx';
import { useServerStatus } from './hooks/useServerStatus.js';
import { useLesson } from './lesson/useLesson.js';
import { useApiKey } from './settings/apiKeyStore.js';

export default function App() {
  const [lesson, dispatch] = useLesson();
  const { key: apiKey } = useApiKey();
  const server = useServerStatus();
  const [settingsOpen, setSettingsOpen] = useState(false);

  const hasKey = Boolean(apiKey) || server.serverKey;
  const openSettings = () => setSettingsOpen(true);

  return (
    <>
      {lesson.status === 'setup' ? (
        <SetupScreen
          apiKey={apiKey}
          hasKey={hasKey}
          server={server}
          onOpenSettings={openSettings}
          onPlanned={(created) => dispatch({ type: 'lessonCreated', ...created })}
        />
      ) : (
        <LessonScreen
          lesson={lesson}
          dispatch={dispatch}
          apiKey={apiKey}
          hasKey={hasKey}
          onOpenSettings={openSettings}
        />
      )}
      <SettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        serverKey={server.serverKey}
      />
    </>
  );
}
