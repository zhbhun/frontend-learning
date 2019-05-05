import React from 'react';
import {
  Platform,
  StyleSheet,
  View,
  Image,
  Text,
}
from 'react-native';

export default class SourceTypeTest extends React.Component {

  static title = 'Source Type Test';

  renderDemo({ platform, title, description, images }) {
    if (platform && Platform.OS !== platform) {
      return null;
    }
    const souces = Array.isArray(images) ? images : [images];
    return (
      <View style={styles.demo}>
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.descriptionText}>{description}</Text>
        <View style={styles.imageContainer}>
          {
            souces.map((image, i) => (
              <Image
                key={i}
                {...image}
              />
            ))
          }
        </View>
      </View>
    );
  }

  render() {
    return (
      <View>
        {demos.map((item, i) => (
          <View key={i}>
            {this.renderDemo(item)}
          </View>
        ))}
      </View>
    );
  }

}

const baseSize = {
  width: 38,
  height: 38,
}

const styles = StyleSheet.create({
  demo: {
    marginVertical: 10,
    marginHorizontal: 16,
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  descriptionText: {
  },
  imageContainer: {
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  image: baseSize,
});

const base64LauncherIcon = 'data:image/png;base64,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';

const demos = [
  {
    title: 'Network Image',
    description: 'If the `source` prop `uri` property is prefixed with ' + '"http", then it will be downloaded from the network.',
    images: [
      { source: { uri: 'https://facebook.github.io/react/img/logo_og.png' } },
      {
        source: { uri: 'https://facebook.github.io/react/img/logo_og.png' },
        style: styles.image,
      },
      {
        source: { ...baseSize, uri: 'https://facebook.github.io/react/img/logo_og.png' },
      },
    ],
  },
  {
    title: 'Static Image',
    description: 'Static assets should be placed in the source code tree, and ' + 'required in the same way as JavaScript modules.',
    images: [
      {
        source: require('./image/uie_thumb_normal.png'),
      },
      {
        source: require('./image/uie_thumb_selected.png'),
        style: { ...baseSize },
      },
      {
        source: require('./image/uie_comment_normal.png'),
      },
      {
        source: require('./image/uie_comment_highlighted.png'),
        style: { ...baseSize },
      },
    ],
  },
  {
    title: 'Base64 Image',
    description: '',
    images: [
      { source: { uri: base64LauncherIcon } },
      {
        source: { uri: base64LauncherIcon, ...baseSize }
      },
      {
        source: { uri: base64LauncherIcon },
        style: { ...baseSize },
      },
    ],
  },
  {
    title: 'Legacy local Image',
    description: 'Images shipped with the native bundle, but not managed by the JS packager',
    images: [
      { source: { uri: 'launcher_icon' } },
      { source: { uri: 'launcher_icon', ...baseSize } },
      { source: { uri: 'launcher_icon' }, style: { ...baseSize } },
    ],
  },
  {
    platform: 'ios',
    title: 'Animated GIF',
    description: '',
    images: { source: { uri: 'http://image.haha.mx/2014/02/02/middle/1115779_c221d1fc47b97bb1605cddc9c8aec0a7_1391347675.gif' } },
  },
  {
    platform: 'ios',
    title: 'defaultSource',
    description: 'Show a placeholder image when a network image is loading',
    images: { source: { uri: 'https://facebook.github.io/origami/public/images/birds.jpg' } },
  },
  /*
  {
    title: 'Bundled images',
    description: 'Images shipped in a separate native bundle',
    images: [
      { uri: 'ImageInBundle', bundle: 'UIExplorerBundle', width: 100, height: 100, },
      { uri: 'ImageInAssetCatalog', bundle: 'UIExplorerBundle', width: 100, height: 100, },
    ],
  }*/
]
