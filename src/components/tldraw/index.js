import { withSize } from 'react-sizeme'
import React from 'react';
import {
  defineMessages,
  useIntl,
} from 'react-intl';
import cx from 'classnames';
import Cursor from './cursor';
import {
  Tldraw,
  ColorStyle,
  DashStyle,
  SizeStyle,
  TDShapeType,
} from "@tldraw/tldraw";
import {
  useCurrentContent,
  useCurrentIndex,
  useCurrentInterval,
} from 'components/utils/hooks';
import { ID } from 'utils/constants';
import storage from 'utils/data/storage';
import { isEmpty } from 'utils/data/validators';
import { buildFileURL } from 'utils/data';
import './index.scss';

const intlMessages = defineMessages({
  aria: {
    id: 'player.presentation.wrapper.aria',
    description: 'Aria label for the presentation wrapper',
  },
});

const getTldrawData = (index) => storage.tldraw[index].data;

const SlideData = (tldrawAPI) => {
  let assets = {};
  let shapes = {};
  const currentIndex = useCurrentIndex(storage.slides);

  const {
    index,
    interval,
  } = useCurrentInterval(storage.tldraw);
  
  if (currentIndex === -1) return { assets, shapes }

  const {
    height,
    id,
    src,
    width,
  } = storage.slides[currentIndex];

  let imageUrl =  buildFileURL(src);
  // tldraw needs the full address as src
  if (!imageUrl.startsWith("http")) {
    imageUrl = window.location.origin + imageUrl;
  }

  assets[`slide-background-asset-${id}`] = {
    id: `slide-background-asset-${id}`,
    size: [width || 0, height || 0],
    src: buildFileURL(src),
    type: "image",
  };

  shapes["slide-background-shape"] = {
    assetId: `slide-background-asset-${id}`,
    childIndex: -1,
    id: "slide-background-shape",
    name: "Image",
    type: TDShapeType.Image,
    parentId: tldrawAPI?.currentPageId,
    point: [0, 0],
    isLocked: true,
    size: [width || 0, height || 0],
    style: {
      dash: DashStyle.Draw,
      size: SizeStyle.Medium,
      color: ColorStyle.Blue,
    },
  };

  if (index === -1 || isEmpty(interval)) return { assets, shapes }

  for (let i = 0; i < interval.length; i++) {
    if (!interval[i]) continue;

    const tldrawData = getTldrawData(index);

    const {
      shape,
    } = tldrawData[i];

    shape.parentId = tldrawAPI?.currentPageId;
    shapes[shape.id] = shape;
  }

  return { assets, shapes }
}

const getViewBox = (index) => {
  const inactive = {
    height: 0,
    x: 0,
    width: 0,
    y: 0,
  };

  if (index === -1) return inactive;

  const currentData = storage.panzooms[index];

  return {
    height: currentData.height,
    x: currentData.x,
    width: currentData.width,
    y: currentData.y,
  };
};

const TldrawPresentation = ({ size }) => {
  const [tldrawAPI, setTLDrawAPI] = React.useState(null);
  const intl = useIntl();
  const currentContent = useCurrentContent();
  const currentPanzoomIndex = useCurrentIndex(storage.panzooms);
  const currentSlideIndex = useCurrentIndex(storage.slides);
  const started = currentPanzoomIndex !== -1;

  const result = SlideData(tldrawAPI);

  let { assets, shapes } = result;
  const { 
    x,
    y,
    width: viewboxWidth,
    height: viewboxHeight
  } =  getViewBox(currentPanzoomIndex);

  let svgWidth;
  let svgHeight;
  svgWidth = (size.height * viewboxWidth) / viewboxHeight;
  if (size.width < svgWidth) {
    svgHeight = (size.height * size.width) / svgWidth;
    svgWidth = size.width;
  } else {
    svgHeight = size.height;
  }

  React.useEffect(() => {
    let zoom = 
      Math.min(
        svgWidth / viewboxWidth,
        svgHeight / viewboxHeight
      );

    tldrawAPI?.setCamera([x, y], zoom);

  }, [svgWidth, svgHeight, viewboxWidth, viewboxHeight, x, y, currentSlideIndex, tldrawAPI, size, result]);
  
  React.useEffect(() => {
    tldrawAPI?.replacePageContent(shapes, {}, assets)
  }, [tldrawAPI, shapes, assets]);

  return (
    <div
      aria-label={intl.formatMessage(intlMessages.aria)}
      className={cx('presentation-wrapper', { inactive: currentContent !== ID.PRESENTATION })}
      id={ID.PRESENTATION}
    >
      {!started 
        ? <div className={cx('presentation', 'logo')}/>
        : <div className={'presentation'}
            style={{
              position: 'absolute',
              width: svgWidth < 0 ? 0 : svgWidth,
              height: svgHeight < 0 ? 0 : svgHeight,
          }}>
            <Cursor tldrawAPI={tldrawAPI} size={size}/>
            <Tldraw          
              disableAssets={true}
              autofocus={false}
              showPages={false}
              showZoom={false}
              showUI={false}
              showMenu={false}
              showMultiplayerMenu={false}
              readOnly={true}
              onMount={(app) => {
                app.onPan = () => {};
                app.setSelectedIds = () => {};
                app.setHoveredId = () => {};
                setTLDrawAPI(app);
              }}
              onPatch={(e, t, reason) => {
                // disable select
                if (e?.getPageState()?.brush || e?.selectedIds?.length !== 0) {
                  e.patchState(
                    {
                      document: {
                        pageStates: {
                          [e?.currentPageId]: {
                            selectedIds: [],
                            brush: null,
                          },
                        },
                      },
                    },
                  );
                }
                //disable pan&zoom
                if (reason && (reason.includes("zoomed") || reason.includes("panned"))) {
                  let zoom = 
                    Math.min(
                      svgWidth / viewboxWidth,
                      svgHeight / viewboxHeight
                    );
                  tldrawAPI?.setCamera([x, y], zoom);
                }
              }}
            />
          </div>
      }
    </div>
  );
};

const areEqual = () => true;

export default React.memo(withSize({ monitorHeight: true })(TldrawPresentation), areEqual);