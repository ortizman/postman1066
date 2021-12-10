import * as React from 'react';
import * as ReactDOM from 'react-dom';
import {
  TreeView,
  TreeViewDragClue,
  processTreeViewItems,
  moveTreeViewItem,
  TreeViewDragAnalyzer,
} from '@progress/kendo-react-treeview';

import { getCollection } from "./postman";

function getSiblings(itemIndex, data) {
  let result = data;
  const indices = itemIndex.split(SEPARATOR).map((index) => Number(index));

  for (let i = 0; i < indices.length - 1; i++) {
    result = result[indices[i]].items || [];
  }

  return result;
}

function getTextByIndex(itemIndex, data) {
  let result = data;
  const indices = itemIndex.split(SEPARATOR).map((index) => Number(index));

  for (let i = 0; i < indices.length - 1; i++) {
    result = result[indices[i]].items || [];
  }

  return result[indices[indices.length - 1]] ? result[indices[indices.length - 1]].text : undefined;
}

function transform(collection) {
  return map(collection?.collection?.item);
}

function map(tree) {
  return tree.map(
    (elem) => ({
      item: elem, text: elem.name, items: elem.item && map(elem.item)
    })
  )
}

const SEPARATOR = '_';

const App = () => {

  const dragClue = React.useRef();
  const dragOverCnt = React.useRef(0);
  const isDragDrop = React.useRef(false);
  const [loading, setLoading] = React.useState(false)
  const [serviceError, setServiceError] = React.useState(false)
  const [tree, setTree] = React.useState([]);
  const [expand, setExpand] = React.useState({
    ids: [],
    idField: 'text',
  });
  const [selected, setSelected] = React.useState({
    ids: []
  });
  const [collectionUrl, setCollectionUrl] = React.useState('');

  const [hierarchicalsSelected, setHierarchicalsSelected] = React.useState([]);

  const [collection, setCollection] = React.useState({})

  function deleteItems() {
    console.log("delete", hierarchicalsSelected)

    hierarchicalsSelected.forEach((itemIndex) => {
      let result = tree;
      const indices = itemIndex.split(SEPARATOR).map((index) => Number(index));
      for (let i = 0; i < indices.length - 1; i++) {
        result = result[indices[i]].items || [];
      }
      delete result[indices[indices.length - 1]];
    })

    setTree(tree);
    cleanSelection();

  }

  function getCollectionWithUrl(event) {
    setLoading(true)
    getCollection(collectionUrl)
      .then((resp) => {
        setServiceError(false);
        setCollection(resp);
        setTree(transform(resp))
      })
      .catch((err) => setServiceError(true))
      .finally(() => setLoading(false))
  }

  function eject(tree) {
    return tree.map(
      (elem) => ({ ...elem.item, item: elem.items && eject(elem.items) })
    );
  }

  function wrapEject() {
    const items = eject(tree);
    let clone = collection;

    clone.collection.item = items;

    download(clone);
  }

  const download = async (cloneCollection) => {
    const fileName = collection.collection.info.name;
    const json = JSON.stringify(cloneCollection);
    const blob = new Blob([json], { type: 'application/json' });
    const href = await URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = href;
    link.download = fileName + ".json";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const getClueClassName = (event) => {
    const eventAnalyzer = new TreeViewDragAnalyzer(event).init();
    const { itemHierarchicalIndex: itemIndex } = eventAnalyzer.destinationMeta;

    if (eventAnalyzer.isDropAllowed) {
      switch (eventAnalyzer.getDropOperation()) {
        case 'child':
          return 'k-i-plus';

        case 'before':
          return itemIndex === '0' || itemIndex.endsWith(`${SEPARATOR}0`)
            ? 'k-i-insert-up'
            : 'k-i-insert-middle';

        case 'after':
          const siblings = getSiblings(itemIndex, tree);
          const lastIndex = Number(itemIndex.split(SEPARATOR).pop());
          return lastIndex < siblings.length - 1
            ? 'k-i-insert-middle'
            : 'k-i-insert-down';

        default:
          break;
      }
    }

    return 'k-i-cancel';
  };

  const onItemDragOver = (event) => {
    let label = selected.ids.slice(0, 10).join(',');
    if (selected.ids.length > 10) {
      label += ' ...'
    }
    dragOverCnt.current++;
    dragClue.current.show(
      event.pageY + 10,
      event.pageX,
      label,
      getClueClassName(event)
    );
  };

  function cleanSelection() {
    setSelected({
      ids: []
    });
    setHierarchicalsSelected([]);
  }

  const onItemDragEnd = (event) => {
    isDragDrop.current = dragOverCnt.current > 0;
    dragOverCnt.current = 0;
    dragClue.current.hide();
    const eventAnalyzer = new TreeViewDragAnalyzer(event).init();

    if (eventAnalyzer.isDropAllowed) {
      const hierarchicalsIds = hierarchicalsSelected.slice();
      setHierarchicalsSelected([]);
      const dest = eventAnalyzer.destinationMeta.itemHierarchicalIndex;
      const oper = eventAnalyzer.getDropOperation() || 'child';
      let updatedTree = tree;
      hierarchicalsIds
        .sort(
          (a, b) =>
            Number(a.split(SEPARATOR).join('')) - Number(b.split(SEPARATOR).join(''))
        )
        .reverse()
        .forEach((itemHierarchicalIndex) => {
          updatedTree = moveTreeViewItem(
            itemHierarchicalIndex,
            updatedTree,
            oper,
            dest
          );

        });
      setTree(updatedTree);
      cleanSelection();
    }
  };

  const onItemClick = (event) => {
    let ids;
    let hierarchicalsIds;
    if (!isDragDrop.current && event.nativeEvent.shiftKey) {
      ids = [];
      let hids = hierarchicalsSelected.slice();
      const index = hids.indexOf(event.itemHierarchicalIndex);
      index === -1 ? hids.push(event.itemHierarchicalIndex) : undefined;

      const sorted = hids.sort(
        (a, b) =>
          Number(a.split(SEPARATOR).join('')) -
          Number(b.split(SEPARATOR).join(''))
      );

      const firstItem = sorted[0].split(SEPARATOR).map(Number);
      const lastItem = sorted[sorted.length - 1].split(SEPARATOR).map(Number);

      // tienen que ser del mismo padre
      if (
        JSON.stringify(firstItem.slice(0, -1)) ===
        JSON.stringify(lastItem.slice(0, -1))
      ) {
        hids = [];
        const lastIndex = firstItem.length - 1;

        while (
          firstItem[lastIndex] !== lastItem[lastIndex]
        ) {
          const itemIndex = firstItem.join(SEPARATOR);
          hids.push(itemIndex);
          ids.push(getTextByIndex(itemIndex, tree));
          firstItem[lastIndex] = firstItem[lastIndex] + 1;
        }
        const lastItemIndex = lastItem.join(SEPARATOR);
        hids.push(lastItemIndex);
        ids.push(getTextByIndex(lastItemIndex, tree));
      }
      hierarchicalsIds = hids;
    } else if (!isDragDrop.current && event.nativeEvent.ctrlKey) {
      ids = selected.ids.slice();
      const index = ids.indexOf(event.item.text);
      index === -1 ? ids.push(event.item.text) : ids.splice(index, 1);

      hierarchicalsIds = hierarchicalsSelected.slice();
      const hIndex = hierarchicalsIds.indexOf(event.itemHierarchicalIndex);
      hIndex === -1
        ? hierarchicalsIds.push(event.itemHierarchicalIndex)
        : hierarchicalsIds.splice(hIndex, 1);
    } else {
      ids = [event.item.text];
      hierarchicalsIds = [event.itemHierarchicalIndex];
    }

    setSelected({ ids });
    setHierarchicalsSelected(hierarchicalsIds || []);
  };

  const onExpandChange = (event) => {
    let ids = expand.ids.slice();
    const index = ids.indexOf(event.item.text);
    index === -1 ? ids.push(event.item.text) : ids.splice(index, 1);
    setExpand({
      ids,
      idField: 'text',
    });
  };

  return (
    <div style={{ margin: '2em' }}>
      <div>
        <div style={{ marginBottom: '15px' }}>
          Enter collection public link: <input value={collectionUrl} onInput={e => setCollectionUrl(e.target.value)} type="url" required name="collectionUrl" size="50" />
          <button disabled={loading} onClick={getCollectionWithUrl} style={{ marginRight: 10, marginLeft: 5 }}>
            get
          </button>
        </div>
        {loading &&
          <h4> <i style={{ color: 'red' }}>Loading...</i></h4>
        }
        {(!loading && serviceError) && 
          <h4> <i style={{ color: 'red' }}>Error fetching collection public link. Please, check url</i></h4>
        }
        {(!loading && collection?.collection !== undefined) &&
          <div>
            <div>
              <h4>{collection.collection?.info.name}</h4>
              <hr />
              <button disabled={hierarchicalsSelected.length <= 0} onClick={deleteItems} style={{ marginRight: 10, marginLeft: 5 }}>
                delete
              </button>
              <button onClick={wrapEject}>
                Eject
              </button>
            </div>
          </div>
        }

      </div>
      <TreeView
        draggable={true}
        onItemClick={onItemClick}
        onItemDragOver={onItemDragOver}
        onItemDragEnd={onItemDragEnd}
        data={processTreeViewItems(tree, {
          expand: expand,
          select: hierarchicalsSelected,
        })}
        expandIcons={true}
        onExpandChange={onExpandChange}
      />
      <TreeViewDragClue ref={dragClue} />
    </div>
  );
};



ReactDOM.render(

  <App />

  , document.getElementById('root'));
