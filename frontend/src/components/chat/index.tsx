import { useUpload } from 'hooks';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import {
  threadHistoryState,
  useAuth,
  useChatData,
  useChatInteract,
  useChatMessages,
  useConfig
} from '@chainlit/react-client';

import { Translator } from 'components/i18n';
import { useTranslation } from 'components/i18n/Translator';
import { TaskList } from 'components/molecules/tasklist/TaskList';

import { useLayoutMaxWidth } from 'hooks/useLayoutMaxWidth';

import { IAttachment, attachmentsState } from 'state/chat';

import Alert from '@/components/Alert';
import { ErrorBoundary } from '../ErrorBoundary';
import ScrollContainer from './ScrollContainer';
import WelcomeScreen from './WelcomeScreen';

const Chat = () => {
  const { user } = useAuth();
  const { config } = useConfig();
  const setAttachments = useSetRecoilState(attachmentsState);
  const setThreads = useSetRecoilState(threadHistoryState);

  const [autoScroll, setAutoScroll] = useState(true);
  const { error, disabled } = useChatData();
  const { uploadFile } = useChatInteract();
  const uploadFileRef = useRef(uploadFile);
  const navigate = useNavigate();

  const fileSpec = useMemo(
    () => ({
      max_size_mb:
        config?.features?.spontaneous_file_upload?.max_size_mb || 500,
      max_files: config?.features?.spontaneous_file_upload?.max_files || 20,
      accept: config?.features?.spontaneous_file_upload?.accept || ['*/*']
    }),
    [config]
  );

  const { t } = useTranslation();
  const layoutMaxWidth = useLayoutMaxWidth();

  useEffect(() => {
    uploadFileRef.current = uploadFile;
  }, [uploadFile]);

  const onFileUpload = useCallback(
    (payloads: File[]) => {
      const attachements: IAttachment[] = payloads.map((file) => {
        const id = uuidv4();

        const { xhr, promise } = uploadFileRef.current(file, (progress) => {
          setAttachments((prev) =>
            prev.map((attachment) => {
              if (attachment.id === id) {
                return {
                  ...attachment,
                  uploadProgress: progress
                };
              }
              return attachment;
            })
          );
        });

        promise
          .then((res) => {
            setAttachments((prev) =>
              prev.map((attachment) => {
                if (attachment.id === id) {
                  return {
                    ...attachment,
                    // Update with the server ID
                    serverId: res.id,
                    uploaded: true,
                    uploadProgress: 100,
                    cancel: undefined
                  };
                }
                return attachment;
              })
            );
          })
          .catch((error) => {
            toast.error(
              `${t('components.organisms.chat.index.failedToUpload')} ${
                file.name
              }: ${error.message}`
            );
            setAttachments((prev) =>
              prev.filter((attachment) => attachment.id !== id)
            );
          });

        return {
          id,
          type: file.type,
          name: file.name,
          size: file.size,
          uploadProgress: 0,
          cancel: () => {
            toast.info(
              `${t('components.organisms.chat.index.cancelledUploadOf')} ${
                file.name
              }`
            );
            xhr.abort();
            setAttachments((prev) =>
              prev.filter((attachment) => attachment.id !== id)
            );
          },
          remove: () => {
            setAttachments((prev) =>
              prev.filter((attachment) => attachment.id !== id)
            );
          }
        };
      });
      setAttachments((prev) => prev.concat(attachements));
    },
    [uploadFile]
  );

  const onFileUploadError = useCallback(
    (error: string) => toast.error(error),
    [toast]
  );

  const upload = useUpload({
    spec: fileSpec,
    onResolved: onFileUpload,
    onError: onFileUploadError,
    options: { noClick: true }
  });

  const { threadId } = useChatMessages();

  useEffect(() => {
    const currentPage = new URL(window.location.href);
    if (
      user &&
      config?.dataPersistence &&
      threadId &&
      currentPage.pathname === '/'
    ) {
      navigate(`/thread/${threadId}`);
    } else {
      setThreads((prev) => ({
        ...prev,
        currentThreadId: threadId
      }));
    }
  }, []);

  const enableMultiModalUpload =
    !disabled && config?.features?.spontaneous_file_upload?.enabled;

  return (
    <div
      {...(enableMultiModalUpload
        ? upload?.getRootProps({ className: 'dropzone' })
        : {})}
      // Disable the onFocus and onBlur events in react-dropzone to avoid interfering with child trigger events
      onBlur={undefined}
      onFocus={undefined}
      className='flex w-full flex-grow relative'
    >
      {upload ? (
          <input id="#upload-drop-input" {...upload.getInputProps()} />
      ) : null}
      <div className='flex flex-grow'>
        {error ? (
          <div
          className="w-full mx-auto my-2"
          style={{
            "maxWidth": layoutMaxWidth
          }}
          >
            <Alert className='mx-2' id="session-error" variant="error">
              <Translator path="components.organisms.chat.index.couldNotReachServer" />
            </Alert>
          </div>
        ) : null}
        {/* <TaskList isMobile={true} /> */}
        <ErrorBoundary>
          <ScrollContainer
            autoScroll={autoScroll}
            setAutoScroll={setAutoScroll}
          >
            <WelcomeScreen 
                        fileSpec={fileSpec}
                        onFileUpload={onFileUpload}
                        onFileUploadError={onFileUploadError}
                        autoScroll={autoScroll}
                        setAutoScroll={setAutoScroll}
            />
            {/* <div className='py-2' />
            <Messages />
          </ScrollContainer>
          <InputBox
            fileSpec={fileSpec}
            onFileUpload={onFileUpload}
            onFileUploadError={onFileUploadError}
            autoScroll={autoScroll}
            setAutoScroll={setAutoScroll}
          /> */}
          </ScrollContainer>
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default Chat;
