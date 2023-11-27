// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

function shouldSetAsProps(el, key, value) {
    if (key === "form" && el.tagName === "INPUT") return false;
    return key in el;
  }
  
  function createRenderer(options) {
    const {
      createElement,
      insert,
      setElementText,
      patchProps,
      createText,
      setText
    } = options;
  
    function mountElement(vnode, container, anchor) {
      const el = (vnode.el = createElement(vnode.type));
      if (typeof vnode.children === "string") {
        setElementText(el, vnode.children);
      } else if (Array.isArray(vnode.children)) {
        vnode.children.forEach((child) => {
          patch(null, child, el);
        });
      }
  
      if (vnode.props) {
        for (const key in vnode.props) {
          patchProps(el, key, null, vnode.props[key]);
        }
      }
  
      insert(el, container, anchor);
    }
  
    function patchChildren(n1, n2, container) {
      if (typeof n2.children === "string") {
        if (Array.isArray(n1.children)) {
          n1.children.forEach((c) => unmount(c));
        }
        setElementText(container, n2.children);
      } else if (Array.isArray(n2.children)) {
        patchKeyedChildren(n1, n2, container);
      } else {
        if (Array.isArray(n1.children)) {
          n1.children.forEach((c) => unmount(c));
        } else if (typeof n1.children === "string") {
          setElementText(container, "");
        }
      }
    }
  
    /**
     * patchKeyedChildren 双端 Diff 代码实现
     * @param n1 旧vnode
     * @param n2 新vnode
     * container 挂载点
     */
    function patchKeyedChildren(n1, n2, container) {
      const oldChildren = n1.children;
      const newChildren = n2.children;
      // 四个索引值
      let oldStartIdx = 0;
      let oldEndIdx = oldChildren.length - 1;
      let newStartIdx = 0;
      let newEndIdx = newChildren.length - 1;
      // 四个索引指向的 vnode 节点
      let oldStartVNode = oldChildren[oldStartIdx];
      let oldEndVNode = oldChildren[oldEndIdx];
      let newStartVNode = newChildren[newStartIdx];
      let newEndVNode = newChildren[newEndIdx];
  
      while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
        if (!oldStartVNode) {
          oldStartVNode = oldChildren[++oldStartIdx];
        } else if (!oldEndVNode) {
          oldEndVNode = newChildren[--oldEndIdx];
        } else if (oldStartVNode.key === newStartVNode.key) {
          // 第一步 oldStartVNode 和 newStartVNode 比较
          patch(oldStartVNode, newStartVNode, container);
          oldStartVNode = oldChildren[++oldStartIdx];
          newStartVNode = newChildren[++newStartIdx];
        } else if (oldEndVNode.key === newEndVNode.key) {
          // 第二步：oldEndVNode 和 newStartVNode 比对
          patch(oldEndVNode, newEndVNode, container);
          oldEndVNode = oldChildren[--oldEndIdx];
          newEndVNode = newChildren[--newEndIdx];
        } else if (oldStartVNode.key === newEndVNode.key) {
          // 第三步：oldStartVNode 和 newEndVNode 比对
          // 仍然需要调用 patch 函数进行打补丁
          patch(oldStartVNode, newEndVNode, container);
          // 移动 DOM 操作
          // oldStartVNode.el 移动到 oldEndVNode.el.nextSibling 前面
          insert(oldStartVNode.el, container, oldEndVNode.el.nextSibling);
  
          oldStartVNode = oldChildren[++oldStartIdx];
          newEndVNode = newChildren[--newEndIdx];
        } else if (oldEndVNode.key === newStartVNode.key) {
          // 第四步：oldEndVNode 和 newStartVNode 比对
          // 仍然需要调用 patch 函数进行打补丁
          patch(oldEndVNode, newStartVNode, container);
          // 移动 DOM 操作
          // oldEndVNode.el 移动到 oldStartVNode.el 前面
          insert(oldEndVNode.el, container, oldStartVNode.el);
          // 移动 DOM 完成，更新索引值，并指向下一个位置
          oldEndVNode = oldChildren[--oldEndIdx];
          newStartVNode = newChildren[++newStartIdx];
        } else {
          // 遍历旧 children，试图寻找与 newStartVNode 拥有相同 key 值的元素
          // idxInOld 就是新的一组子节点的头部节点在旧的一组子节点中的索引
          const idxInOld = oldChildren.findIndex(
            (node) => node.key === newStartVNode.key
          );
          // idxInOld 大于0，说明找到了可复用的节点，并且需要将其对应的真实DOM移动到头部
          if (idxInOld > 0) {
            // idxInOld 位置对应的 vnode 就是需要移动的节点
            const vnodeToMove = oldChildren[idxInOld];
            // 不要忘记移动操作外还应该打补丁
            patch(vnodeToMove, newStartVNode, container);
            // 将 vnodeToMove.el 移动到头部节点 oldStartVNode.el 之前，因此使用后者作为锚点
            insert(vnodeToMove.el, container, oldStartVNode.el);
            // 由于位置 idxInOld 处的节点所对应的真实 DOM 已经移动到了别处，因此将其设置为 undefined
            oldChildren[idxInOld] = undefined;
          } else {
            // 未找到可复用节点，将 newStartVNode  作为新节点挂载到头部，使用当前头部节点 oldStartVNode.el 作为锚点
            patch(null, newStartVNode, container, oldStartVNode.el);
          }
          // 最后更新 newStartIdx 到下一个位置
          newStartVNode = newChildren[++newStartIdx];
        }
      }
      // 循环结束后检查索引值情况
      if (oldEndIdx < oldStartIdx && newStartIdx <= newEndIdx) {
        // 如果满足条件，则说明有新的节点遗留，需要挂载它们
        for (let i = newStartIdx; i <= newEndIdx; i++) {
          patch(null, newChildren[i], container, oldStartVNode.el);
        }
      } else if (newEndIdx < newStartIdx && oldStartIdx <= oldEndIdx) {
        // 如果满足条件，则说明有多余的旧节点，需要移除它们
        for (let i = oldStartIdx; i <= oldEndIdx; i++) {
          unmount(oldChildren[i]);
        }
      }
    }
  
    function patchElement(n1, n2) {
      const el = (n2.el = n1.el);
      const oldProps = n1.props;
      const newProps = n2.props;
  
      for (const key in newProps) {
        if (newProps[key] !== oldProps[key]) {
          patchProps(el, key, oldProps[key], newProps[key]);
        }
      }
      for (const key in oldProps) {
        if (!(key in newProps)) {
          patchProps(el, key, oldProps[key], null);
        }
      }
  
      patchChildren(n1, n2, el);
    }
  
    function unmount(vnode) {
      if (vnode.type === Fragment) {
        vnode.children.forEach((c) => unmount(c));
        return;
      }
      const parent = vnode.el.parentNode;
      if (parent) {
        parent.removeChild(vnode.el);
      }
    }
  
    function patch(n1, n2, container, anchor) {
      // type 表示 标签类型 列入 p div 等等
      if (n1 && n1.type !== n2.type) {
        unmount(n1);
        n1 = null;
      }
  
      const { type } = n2;
  
      if (typeof type === "string") {
        if (!n1) {
          mountElement(n2, container, anchor);
        } else {
          patchElement(n1, n2);
        }
      } else if (type === Text) {
        if (!n1) {
          const el = (n2.el = createText(n2.children));
          insert(el, container);
        } else {
          const el = (n2.el = n1.el);
          if (n2.children !== n1.children) {
            setText(el, n2.children);
          }
        }
      } else if (type === Fragment) {
        if (!n1) {
          n2.children.forEach((c) => patch(null, c, container));
        } else {
          patchChildren(n1, n2, container);
        }
      }
    }
  
    function render(vnode, container) {
      if (vnode) {
        // 新 vnode 存在，将其与旧 vnode 一起传递给 patch 函数进行打补丁
        patch(container._vnode, vnode, container);
      } else {
        if (container._vnode) {
          // 旧 vnode 存在，且新 vnode 不存在，说明是卸载(unmount)操作
          unmount(container._vnode);
        }
      }
      // 把 vnode 存储到 container._vnode 下，即后续渲染中的旧 vnode
      container._vnode = vnode;
    }
  
    return {
      render
    };
  }
  
  const renderer = createRenderer({
    createElement(tag) {
      return document.createElement(tag);
    },
    setElementText(el, text) {
      el.textContent = text;
    },
    insert(el, parent, anchor = null) {
      parent.insertBefore(el, anchor);
    },
    createText(text) {
      return document.createTextNode(text);
    },
    setText(el, text) {
      el.nodeValue = text;
    },
    patchProps(el, key, prevValue, nextValue) {
      if (/^on/.test(key)) {
        const invokers = el._vei || (el._vei = {});
        let invoker = invokers[key];
        const name = key.slice(2).toLowerCase();
        if (nextValue) {
          if (!invoker) {
            invoker = el._vei[key] = (e) => {
              console.log(e.timeStamp);
              console.log(invoker.attached);
              if (e.timeStamp < invoker.attached) return;
              if (Array.isArray(invoker.value)) {
                invoker.value.forEach((fn) => fn(e));
              } else {
                invoker.value(e);
              }
            };
            invoker.value = nextValue;
            invoker.attached = performance.now();
            el.addEventListener(name, invoker);
          } else {
            invoker.value = nextValue;
          }
        } else if (invoker) {
          el.removeEventListener(name, invoker);
        }
      } else if (key === "class") {
        el.className = nextValue || "";
      } else if (shouldSetAsProps(el, key, nextValue)) {
        const type = typeof el[key];
        if (type === "boolean" && nextValue === "") {
          el[key] = true;
        } else {
          el[key] = nextValue;
        }
      } else {
        el.setAttribute(key, nextValue);
      }
    }
  });
  
  const Fragment = Symbol();
  const VNode1 = {
    type: "div",
    children: [
      { type: "p", children: "1", key: 1 },
      { type: "p", children: "2", key: 2 },
      { type: "p", children: "3", key: 3 }
    ]
  };
  renderer.render(VNode1, document.querySelector("#app"));
  
  const VNode2 = {
    type: "div",
    children: [
      { type: "p", children: "1", key: 1 },
      { type: "p", children: "3", key: 3 }
    ]
  };
  
  setTimeout(() => {
    console.log("update");
    renderer.render(VNode2, document.querySelector("#app"));
  }, 400);
  