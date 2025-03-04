import classnames from 'classnames';
import { CommonFormTypes } from 'globalConstants';
import debounce from 'lodash/debounce';
import { language } from 'monaco-editor/esm/vs/basic-languages/sql/sql';
import React, {
  memo,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import MonacoEditor, { monaco } from 'react-monaco-editor';
import { useDispatch, useSelector } from 'react-redux';
import styled from 'styled-components/macro';
import { FONT_SIZE_BASE } from 'styles/StyleConstants';
import { selectThemeKey } from 'styles/theme/slice/selectors';
import { RootState } from 'types';
import { ViewStatus, ViewViewModelStages } from '../../constants';
import { EditorContext } from '../../EditorContext';
import { SaveFormContext } from '../../SaveFormContext';
import { useViewSlice } from '../../slice';
import { selectCurrentEditingViewAttr } from '../../slice/selectors';
import {
  getEditorProvideCompletionItems,
  runSql,
  saveView,
} from '../../slice/thunks';
import { isNewView } from '../../utils';

// Text selected when "value" prop changes issue
// https://github.com/react-monaco-editor/react-monaco-editor/issues/325

export const SQLEditor = memo(() => {
  const { actions } = useViewSlice();
  const dispatch = useDispatch();
  const {
    editorInstance,
    editorCompletionItemProviderRef,
    setEditor,
    initActions,
  } = useContext(EditorContext);
  const { showSaveForm } = useContext(SaveFormContext);
  const id = useSelector<RootState>(state =>
    selectCurrentEditingViewAttr(state, { name: 'id' }),
  ) as string;
  const script = useSelector<RootState>(state =>
    selectCurrentEditingViewAttr(state, { name: 'script' }),
  ) as string;
  const stage = useSelector<RootState>(state =>
    selectCurrentEditingViewAttr(state, { name: 'stage' }),
  ) as ViewViewModelStages;
  const status = useSelector<RootState>(state =>
    selectCurrentEditingViewAttr(state, { name: 'status' }),
  ) as ViewStatus;
  const theme = useSelector(selectThemeKey);

  const run = useCallback(() => {
    const fragment = editorInstance
      ?.getModel()
      ?.getValueInRange(editorInstance.getSelection()!);
    dispatch(runSql({ id, isFragment: !!fragment }));
  }, [dispatch, id, editorInstance]);

  const save = useCallback(
    (resolve?) => {
      dispatch(saveView({ resolve }));
    },
    [dispatch],
  );

  const callSave = useCallback(() => {
    if (
      status !== ViewStatus.Archived &&
      stage === ViewViewModelStages.Saveable
    ) {
      if (isNewView(id)) {
        showSaveForm({
          type: CommonFormTypes.Edit,
          visible: true,
          parentIdLabel: '目录',
          onSave: (values, onClose) => {
            dispatch(
              actions.changeCurrentEditingView({
                ...values,
                parentId: values.parentId || null,
              }),
            );
            save(onClose);
          },
        });
      } else {
        save();
      }
    }
  }, [dispatch, actions, stage, status, id, save, showSaveForm]);

  const editorWillMount = useCallback(
    editor => {
      editor.languages.register({ id: 'sql' });
      editor.languages.setMonarchTokensProvider('sql', language);
      dispatch(
        getEditorProvideCompletionItems({
          resolve: getItems => {
            const providerRef = editor.languages.registerCompletionItemProvider(
              'sql',
              {
                provideCompletionItems: getItems,
              },
            );
            if (editorCompletionItemProviderRef) {
              editorCompletionItemProviderRef.current = providerRef;
            }
          },
        }),
      );
    },
    [dispatch, editorCompletionItemProviderRef],
  );

  const editorDidMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor) => {
      setEditor(editor);
      // Removing the tooltip on the read-only editor
      // https://github.com/microsoft/monaco-editor/issues/1742
      const messageContribution = editor.getContribution(
        'editor.contrib.messageController',
      );
      editor.onDidChangeCursorSelection(e => {
        dispatch(
          actions.changeCurrentEditingView({
            fragment: editor.getModel()?.getValueInRange(e.selection),
          }),
        );
      });
      editor.onDidAttemptReadOnlyEdit(() => {
        (messageContribution as any).showMessage(
          '回收站中不可编辑',
          editor.getPosition(),
        );
      });
    },
    [setEditor, dispatch, actions],
  );

  useEffect(() => {
    editorInstance?.layout();
    return () => {
      editorInstance?.dispose();
    };
  }, [editorInstance]);

  useEffect(() => {
    return () => {
      setEditor(void 0);
    };
  }, [setEditor]);

  useEffect(() => {
    initActions({ onRun: run, onSave: callSave });
  }, [initActions, run, callSave]);

  useEffect(() => {
    editorInstance?.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter,
      run,
    );
    editorInstance?.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyCode.KEY_S,
      callSave,
    );
  }, [editorInstance, run, callSave]);

  useHotkeys(
    'ctrl+enter,command+enter',
    () => {
      run();
    },
    [run],
  );

  useHotkeys(
    'ctrl+s,command+s',
    e => {
      e.preventDefault();
      callSave();
    },
    [dispatch, callSave],
  );

  const debouncedEditorChange = useMemo(() => {
    const editorChange = script => {
      dispatch(actions.changeCurrentEditingView({ script }));
    };
    return debounce(editorChange, 200);
  }, [dispatch, actions]);

  return (
    <EditorWrapper
      className={classnames({
        archived: status === ViewStatus.Archived,
      })}
    >
      <MonacoEditor
        value={script}
        language="sql"
        theme={`vs-${theme}`}
        options={{
          fontSize: FONT_SIZE_BASE * 0.875,
          minimap: { enabled: false },
          readOnly: status === ViewStatus.Archived,
        }}
        onChange={debouncedEditorChange}
        editorWillMount={editorWillMount}
        editorDidMount={editorDidMount}
      />
    </EditorWrapper>
  );
});

const EditorWrapper = styled.div`
  position: relative;
  flex: 1;
  min-height: 0;

  &.archived {
    .view-lines {
      * {
        color: ${p => p.theme.textColorDisabled};
      }
    }
  }
`;
