import { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { toast } from 'sonner';

import {
  ChainlitContext,
  IAction,
  IFeedback,
  IMessageElement,
  IStep,
  IThread,
  accessTokenState,
  nestMessages,
  sideViewState,
  useApi,
  useConfig
} from '@chainlit/react-client';

import { useLayoutMaxWidth } from 'hooks/useLayoutMaxWidth';
import { ErrorBoundary } from './ErrorBoundary';
import { MessageContext } from '@/contexts/MessageContext';
import { Messages } from './chat/Messages';
import Alert from './Alert';
import { Loader } from './Loader';
import { useNavigate } from 'react-router-dom';
import AutoResumeThread from './AutoResumeThread';

type Props = {
  id: string;
};

const PersistedThread = ({ id }: Props) => {
    const {config} = useConfig()
const { data: thread, error, isLoading } = useApi<IThread>(
    id ? `/project/thread/${id}` : null,
    {
        revalidateOnFocus: false
    }
    );
    const navigate = useNavigate()
    const setSideView = useSetRecoilState(sideViewState);
  const accessToken = useRecoilValue(accessTokenState);
  const [steps, setSteps] = useState<IStep[]>([]);
  const apiClient = useContext(ChainlitContext);
  const { t } = useTranslation();
  const layoutMaxWidth = useLayoutMaxWidth();

  useEffect(() => {
    if (!thread) return;
    setSteps(thread.steps);
  }, [thread]);

  const onFeedbackUpdated = useCallback(
    async (message: IStep, onSuccess: () => void, feedback: IFeedback) => {
      try {
        toast.promise(apiClient.setFeedback(feedback, accessToken), {
          loading: 'Updating',
          success: (res) => {
            setSteps((prev) =>
              prev.map((step) => {
                if (step.id === message.id) {
                  return {
                    ...step,
                    feedback: {
                      ...feedback,
                      id: res.feedbackId
                    }
                  };
                }
                return step;
              })
            );

            onSuccess();
            return 'Feedback updated!';
          },
          error: (err) => {
            return <span>{err.message}</span>;
          }
        });
      } catch (err) {
        console.log(err);
      }
    },
    []
  );

  const onFeedbackDeleted = useCallback(
    async (message: IStep, onSuccess: () => void, feedbackId: string) => {
      try {
        toast.promise(apiClient.deleteFeedback(feedbackId, accessToken), {
          loading: t('components.organisms.chat.Messages.index.updating'),
          success: () => {
            setSteps((prev) =>
              prev.map((step) => {
                if (step.id === message.id) {
                  return {
                    ...step,
                    feedback: undefined
                  };
                }
                return step;
              })
            );

            onSuccess();
            return t(
              'components.organisms.chat.Messages.index.feedbackUpdated'
            );
          },
          error: (err) => {
            return <span>{err.message}</span>;
          }
        });
      } catch (err) {
        console.log(err);
      }
    },
    []
  );

  const onElementRefClick = useCallback(
    (element: IMessageElement) => {

      if (element.display === 'side') {
        setSideView(element);
        return;
      }

      let path = `/element/${element.id}`;

      if (element.threadId) {
        path += `?thread=${element.threadId}`;
      }

      return navigate(element.display === 'page' ? path : '#');
    },
    [setSideView, navigate]
  );

  const onError = useCallback((error: string) => toast.error(error), [toast]);

  const elements = thread?.elements || [];
  const actions: IAction[] = [];
  const messages = nestMessages(steps);

  const memoizedContext = useMemo(() => {
    return {
      allowHtml: config?.features?.unsafe_allow_html,
      latex: config?.features?.latex,
      loading: false,
      showFeedbackButtons: !!config?.dataPersistence,
      uiName: config?.ui?.name || '',
      cot: config?.ui?.cot || "hidden",
      onElementRefClick,
      onError,
      onFeedbackUpdated,
      onFeedbackDeleted
    };
  }, [
    config?.ui?.name,
    config?.ui?.cot,
    config?.features?.unsafe_allow_html,
    onElementRefClick,
    onError,
    onFeedbackUpdated
  ]);

  if (isLoading) {
    return (
        <div className='flex flex-col h-full w-full items-center justify-center'>
            <Loader className='!size-6' />
      </div>
    );
  }

  if (!thread) {
    return null;
  }

  return (
    <div className='flex w-full flex-col flex-grow relative overflow-y-auto'>
      <AutoResumeThread threadId={id} />
        {error ? <Alert variant='error'>{error.message}</Alert> : null}

      <ErrorBoundary>

    <MessageContext.Provider value={memoizedContext}>
<div className='flex flex-col mx-auto w-full flex-grow p-4'
style={{
"maxWidth": layoutMaxWidth
}}
>
    <Messages
      indent={0}
      messages={messages}
      elements={elements as any}
      actions={actions}
    />
         </div>
  </MessageContext.Provider>
   
        </ErrorBoundary>
    </div>
  );
};

export { PersistedThread };
