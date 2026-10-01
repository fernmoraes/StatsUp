// Teclado sem sobrepor campos, sem libs nativas extras (funciona no Expo Go).
//
// Com o Android edge-to-edge a janela pode ou não encolher quando o teclado
// abre (depende do aparelho/versão). Em vez de adivinhar, medimos: `overlap` é
// quanto do container o teclado realmente cobre (0 se a janela já encolheu).
// A tela usa isso como espaço extra embaixo e rola o campo focado para a vista.
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Keyboard, Platform, TextInput } from 'react-native';

const MARGIN = 24; // folga entre o campo e o topo do teclado

export const KeyboardScrollContext = createContext({ ensureVisible: () => {} });
export const useEnsureVisible = () => useContext(KeyboardScrollContext).ensureVisible;

// rootRef: View que ocupa a tela. scrollRef: ScrollView/FlatList/SectionList.
// extraBottom: altura de algo fixo acima do teclado (ex.: barra "Salvar").
export function useKeyboardAvoid({ rootRef, scrollRef, extraBottom = 0 }) {
  const [overlap, setOverlap] = useState(0);
  const offsetY = useRef(0);
  const keyboardTop = useRef(null);

  const scrollToY = useCallback((y) => {
    const node = scrollRef.current;
    if (!node) return;
    if (node.scrollTo) node.scrollTo({ y, animated: true });
    else if (node.scrollToOffset) node.scrollToOffset({ offset: y, animated: true });
    else if (node.getScrollResponder) node.getScrollResponder()?.scrollTo({ y, animated: true });
  }, [scrollRef]);

  // Rola só o necessário para o campo focado ficar acima do teclado.
  const ensureVisible = useCallback(() => {
    const top = keyboardTop.current;
    const input = TextInput.State.currentlyFocusedInput?.();
    if (top == null || !input?.measureInWindow) return;
    input.measureInWindow((x, y, w, h) => {
      const limit = top - extraBottom - MARGIN;
      const bottom = y + h;
      if (bottom > limit) scrollToY(offsetY.current + (bottom - limit));
    });
  }, [extraBottom, scrollToY]);

  // Mede quanto do container o teclado cobre agora.
  const measure = useCallback((afterMeasure) => {
    const top = keyboardTop.current;
    const root = rootRef.current;
    if (top == null || !root?.measureInWindow) return;
    root.measureInWindow((x, y, w, h) => {
      setOverlap(Math.max(0, y + h - top));
      if (afterMeasure) afterMeasure();
    });
  }, [rootRef]);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvt, (e) => {
      keyboardTop.current = e.endCoordinates.screenY;
      // espera o layout aplicar o espaço extra antes de rolar
      measure(() => setTimeout(ensureVisible, Platform.OS === 'ios' ? 260 : 60));
    });
    const hide = Keyboard.addListener(hideEvt, () => {
      keyboardTop.current = null;
      setOverlap(0);
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [measure, ensureVisible]);

  // O container pode mudar de tamanho com o teclado aberto (a barra de abas
  // some, a janela encolhe...): mede de novo para não sobrar nem faltar espaço.
  const onRootLayout = useCallback(() => {
    if (keyboardTop.current != null) measure();
  }, [measure]);

  const onScroll = useCallback((e) => {
    offsetY.current = e.nativeEvent.contentOffset.y;
  }, []);

  // Campo focado com o teclado já aberto (ex.: botão "Próximo").
  const ensureVisibleSoon = useCallback(() => {
    if (keyboardTop.current != null) setTimeout(ensureVisible, 60);
  }, [ensureVisible]);

  return { overlap, onScroll, onRootLayout, ensureVisible: ensureVisibleSoon };
}
