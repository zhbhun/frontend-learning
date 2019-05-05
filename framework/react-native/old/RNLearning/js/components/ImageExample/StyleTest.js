import React from 'react';
import {
  Platform,
  StyleSheet,
  View,
  ScrollView,
  Image,
  Text,
}
from 'react-native';

export default class TypeTest extends React.Component {

  static title = 'Style Test';

  renderDemo({ platform, title = '', description = '', render }) {
    if (platform && Platform.OS !== platform) {
      return null;
    }
    return (
      <View style={styles.demo}>
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.descriptionText}>{description}</Text>
        {render()}
      </View>
    );
  }

  render() {
    return (
      <ScrollView>
        {demos.map((item, i) => (
          <View key={i}>
            {this.renderDemo(item)}
          </View>
        ))}
      </ScrollView>
    );
  }

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
  horizontal: {
    flexDirection: 'row',
  },
  topMargin: {
    marginTop: 10,
  },
  leftMargin: {
    marginLeft: 10,
  },
  base: {
    width: 38,
    height: 38,
  },
  background: {
    backgroundColor: '#222222'
  },
  // resize mode
  resizeModeText: {
    fontSize: 11,
    marginBottom: 3,
  },
  resizeMode: {
    width: 90,
    height: 60,
    borderWidth: 0.5,
    borderColor: 'black'
  },
  // Cap Insets
  capInsetsbackground: {
    backgroundColor: '#F6F6F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  capInsetsStoryBackground: {
    width: 250,
    height: 150,
    borderWidth: 1,
  },
  capInsetsText: {
    fontSize: 13.5,
  }
});


const fullImage = require('./image/logo_og.png'); // 1200*630
const smallImage = require('./image/logo_small_2x.png'); // 76*76

const demos = [
  {
    title: 'Layout',
    description: '',
    render() {
      return (
        <View style={[styles.horizontal, { backgroundColor: 'grey' }]}>
          <Image
            source={smallImage}
            style={[
              styles.base,
              styles.background,
            ]}
          />
          <Image
            resizeMode={Image.resizeMode.contain}
            source={smallImage}
            style={[
              { flex: 1, height: 38},
              styles.leftMargin,
              styles.background,
            ]}
          />
        </View>
      );
    },
  },
  {
    title: 'Resize Mode',
    description: 'The `resizeMode` style prop controls how the image is rendered within the frame.',
    render() {
      return (
        <View>
          {[smallImage, fullImage].map((image, index) => {
            return (
            <View key={index}>
              <View style={styles.horizontal}>
                <View>
                  <Text style={[styles.resizeModeText]}>
                    Contain
                  </Text>
                  <Image
                    style={styles.resizeMode}
                    resizeMode={Image.resizeMode.contain}
                    source={image}
                  />
                </View>
                <View style={styles.leftMargin}>
                  <Text style={[styles.resizeModeText]}>
                    Cover
                  </Text>
                  <Image
                    style={styles.resizeMode}
                    resizeMode={Image.resizeMode.cover}
                    source={image}
                  />
                </View>
              </View>
              <View style={styles.horizontal}>
                <View>
                  <Text style={[styles.resizeModeText]}>
                    Stretch
                  </Text>
                  <Image
                    style={styles.resizeMode}
                    resizeMode={Image.resizeMode.stretch}
                    source={image}
                  />
                </View>
                { Platform.OS === 'ios' ?
                  <View style={styles.leftMargin}>
                    <Text style={[styles.resizeModeText]}>
                      Repeat
                    </Text>
                    <Image
                      style={styles.resizeMode}
                      resizeMode={Image.resizeMode.repeat}
                      source={image}
                    />
                  </View>
                : null }
                { Platform.OS === 'android' ?
                  <View style={styles.leftMargin}>
                    <Text style={[styles.resizeModeText]}>
                      Center
                    </Text>
                    <Image
                      style={styles.resizeMode}
                      resizeMode={Image.resizeMode.center}
                      source={image}
                    />
                  </View>
                : null }
              </View>
            </View>
          );
        })}
        </View>
      );
    },
  },
  {
    title: 'Border Color',
    render() {
      return (
        <View style={styles.horizontal}>
          <Image
            source={smallImage}
            style={[
              styles.base,
              styles.background,
            ]}
          />
          <Image
            source={smallImage}
            style={[
              styles.base,
              styles.leftMargin,
              styles.background,
              { borderWidth: 2, borderColor: '#f099f0' }
            ]}
          />
        </View>
      );
    },
  },
  {
    title: 'Border Width',
    render() {
      return (
        <View style={styles.horizontal}>
          <Image
            source={smallImage}
            style={[
              styles.base,
              styles.background,
            ]}
          />
          <Image
            source={smallImage}
            style={[
              styles.base,
              styles.background,
              styles.leftMargin,
              {borderWidth: 8, borderColor: '#f099f0'}
            ]}
          />
        </View>
      );
    },
  },
  {
    title: 'Border Radius',
    render() {
      return (
        <View style={styles.horizontal}>
          <Image
            style={[styles.base, { borderRadius: 5 }]}
            source={fullImage}
          />
          <Image
            style={[styles.base, styles.leftMargin, { borderRadius: 19 }]}
            source={fullImage}
          />
        </View>
      );
    },
  },
  {
    title: 'Background Color',
    render() {
      return (
        <View>
          <View style={styles.horizontal}>
            <Image
              source={smallImage}
              style={styles.base}
            />
            <Image
              style={[
                styles.base,
                styles.leftMargin,
                { backgroundColor: 'rgba(0, 0, 100, 0.25)' }
              ]}
              source={smallImage}
            />
            <Image
              style={[
                styles.base,
                styles.leftMargin,
                { backgroundColor: 'red' }
              ]}
              source={smallImage}
            />
          </View>
          <View style={[styles.horizontal, styles.topMargin]}>
            <Image
              source={fullImage}
              style={styles.base}
            />
            <Image
              style={[
                styles.base,
                styles.leftMargin,
                { backgroundColor: 'rgba(0, 0, 100, 0.25)' }
              ]}
              source={fullImage}
            />
            <Image
              style={[
                styles.base,
                styles.leftMargin,
                { backgroundColor: 'red' }
              ]}
              source={fullImage}
            />
          </View>
        </View>
      );
    },
  },
  {
    title: 'Opacity',
    render() {
      return (
        <View>
          <View style={styles.horizontal}>
            <Image
              style={[styles.base, { opacity: 1 }]}
              source={smallImage}
            />
            <Image
              style={[styles.base, styles.leftMargin, { opacity: 0.8 }]}
              source={smallImage}
            />
            <Image
              style={[styles.base, styles.leftMargin, { opacity: 0.6 }]}
              source={smallImage}
            />
            <Image
              style={[styles.base, styles.leftMargin, { opacity: 0.4 }]}
              source={smallImage}
            />
            <Image
              style={[styles.base, styles.leftMargin, { opacity: 0.2 }]}
              source={smallImage}
            />
            <Image
              style={[styles.base, styles.leftMargin, { opacity: 0 }]}
              source={smallImage}
            />
          </View>
          <View style={[styles.horizontal, styles.topMargin]}>
            <Image
              style={[styles.base, { opacity: 1 }]}
              source={fullImage}
            />
            <Image
              style={[styles.base, styles.leftMargin, { opacity: 0.8 }]}
              source={fullImage}
            />
            <Image
              style={[styles.base, styles.leftMargin, { opacity: 0.6 }]}
              source={fullImage}
            />
            <Image
              style={[styles.base, styles.leftMargin, { opacity: 0.4 }]}
              source={fullImage}
            />
            <Image
              style={[styles.base, styles.leftMargin, { opacity: 0.2 }]}
              source={fullImage}
            />
            <Image
              style={[styles.base, styles.leftMargin, { opacity: 0 }]}
              source={fullImage}
            />
          </View>
        </View>
      );
    },
  },
  {
    title: 'Tint Color',
    description: 'The `tintColor` style prop changes all the non-alpha ' +
      'pixels to the tint color.',
    render() {
      return (
        <View>
          <View style={styles.horizontal}>
            <Image
              source={smallImage}
              style={[styles.base, { borderRadius: 5, tintColor: '#5ac8fa' }]}
            />
            <Image
              source={smallImage}
              style={[styles.base, styles.leftMargin, { borderRadius: 5, tintColor: '#4cd964' }]}
            />
            <Image
              source={smallImage}
              style={[styles.base, styles.leftMargin, { borderRadius: 5, tintColor: '#ff2d55' }]}
            />
            <Image
              source={smallImage}
              style={[styles.base, styles.leftMargin, { borderRadius: 5, tintColor: '#8e8e93' }]}
            />
          </View>
          <View style={[styles.horizontal, styles.topMargin]}>
            <Image
              source={fullImage}
              style={[styles.base, { borderRadius: 5, tintColor: '#5ac8fa' }]}
            />
            <Image
              source={fullImage}
              style={[styles.base, styles.leftMargin, { borderRadius: 5, tintColor: '#4cd964' }]}
            />
            <Image
              source={fullImage}
              style={[styles.base, styles.leftMargin, { borderRadius: 5, tintColor: '#ff2d55' }]}
            />
            <Image
              source={fullImage}
              style={[styles.base, styles.leftMargin, { borderRadius: 5, tintColor: '#8e8e93' }]}
            />
          </View>
        </View>
      );
    },
  },
  {
    platform: 'ios',
    title: 'Cap Insets',
    description: 'When the image is resized, the corners of the size specified by capInsets will stay a fixed size, but the center content and borders of the image will be stretched. This is useful for creating resizable rounded buttons, shadows, and other resizable assets.',
    render() {
      return (
        <View>
          <View style={styles.capInsetsbackground}>
            <Text>
              capInsets: none
            </Text>
            <Image
              source={nativeImageSource({
                ios: 'story-background',
                width: 60,
                height: 60
              })}
              style={styles.capInsetsStoryBackground}
              resizeMode={Image.resizeMode.stretch}
              capInsets={{ left: 0, right: 0, bottom: 0, top: 0 }}
            />
          </View>
          <View style={[styles.background, { paddingTop: 10 }]}>
            <Text>
              capInsets: 15
            </Text>
            <Image
              source={nativeImageSource({
                ios: 'story-background',
                width: 60,
                height: 60
              })}
              style={styles.storyBackground}
              resizeMode={Image.resizeMode.stretch}
              capInsets={{ left: 15, right: 15, bottom: 15, top: 15 }}
            />
          </View>
        </View>
      );
    },
  }
];
