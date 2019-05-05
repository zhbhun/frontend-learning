import React from 'react';
import {
  StyleSheet,
  View,
  Image,
  Text,
} from 'react-native';

const fullImage = 'https://facebook.github.io/react/img/logo_og.png'; // 1200*630

class ImageSizeExample extends React.Component {

  state = {
    width: 0,
    height: 0,
  };

  componentDidMount() {
    Image.getSize(this.props.source.uri, (width, height) => {
      this.setState({width, height});
    });
  }

  render() {
    return (
      <View style={{flexDirection: 'row'}}>
        <Image
          style={{
            width: 60,
            height: 60,
            backgroundColor: 'transparent',
            marginRight: 10,
          }}
          source={this.props.source}
        />
        <Text>
          Actual dimensions:{'\n'}
          Width: {this.state.width}, Height: {this.state.height}
        </Text>
      </View>
    );
  }

}

class ImagePrefetchExample extends React.Component {

  state = {
    prefetched: false,
  };


  componentWillMount() {
    const { uri } = this.props;
    this.prefetchImage = `${uri}?1${Date.now()}`;
    this.normalImage = `${uri}?2${Date.now()}`;
  }

  componentDidMount() {
    Image.prefetch(this.prefetchImage)
    .then(() => {
      this.setState({ prefetched: true });
    }, error => {
      //
    });
  }

  render() {
    if (!this.state.prefetched) {
      return null;
    }
    return (
      <View style={styles.horizontal}>
        <Image
          source={{ uri: this.prefetchImage }}
          style={[styles.base]}
        />
        <Image
          source={{ uri: this.normalImage }}
          style={[styles.base]}
        />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  base: {
    width: 38,
    height: 38,
  },
  horizontal: {
    flexDirection: 'row',
  },
});


export default {
  title: 'API Test',
  description: '',
  examples: [
    {
      title: 'getSize',
      description: 'Retrieve the width and height (in pixels) of an image prior to displaying it. This method can fail if the image cannot be found, or fails to download.',
      render() {
        return <ImageSizeExample source={{ uri: fullImage }} />;
      }
    },
    {
      title: 'prefetch',
      description: 'Prefetches a remote image for later use by downloading it to the disk cache',
      render() {
        return <ImagePrefetchExample uri={fullImage} />;
      },
    },
  ]
};

/*
import React from 'react';
import {
  StyleSheet,
  View,
  Image,
  Text,
} from 'react-native';

const IMAGE_URL = 'https://facebook.github.io/react/img/logo_small_2x.png';
const IMAGE_PREFETCH_URL = `${IMAGE_URL}?r=1&t=` + Date.now();
const prefetchTask = Image.prefetch(IMAGE_PREFETCH_URL);

export default class EventTest extends React.Component {

  static title = 'Event Test';

  state = {
    events: [],
    startLoadPrefetched: false,
    mountTime: new Date(),
    source: `${IMAGE_URL}?r=1&t=` + Date.now(),
  };

  componentWillMount() {
    this.setState({ mountTime: new Date() });
  }

  render = () => {
    var { mountTime } = this.state;

    return (
      <View>
        <Image
          source={{ uri: this.state.source }}
          style={[styles.base, { overflow: 'visible' }]}
          onLoadStart={() => this._loadEventFired(`✔ onLoadStart (+${new Date() - mountTime}ms)`)}
          onLoad={(event) => {
            // Currently this image source feature is only available on iOS.
            if (event.nativeEvent.source) {
              const url = event.nativeEvent.source.url;
              this._loadEventFired(`✔ onLoad (+${new Date() - mountTime}ms) for URL ${url}`);
            } else {
              this._loadEventFired(`✔ onLoad (+${new Date() - mountTime}ms)`);
            }
          }}
          onLoadEnd={() => {
            this._loadEventFired(`✔ onLoadEnd (+${new Date() - mountTime}ms)`);
            this.setState({ startLoadPrefetched: true }, () => {
              prefetchTask.then(() => {
                this._loadEventFired(`✔ Prefetch OK (+${new Date() - mountTime}ms)`);
              }, error => {
                this._loadEventFired(`✘ Prefetch failed (+${new Date() - mountTime}ms)`);
              });
            });
          }}
        />
        {this.state.startLoadPrefetched ?
          <Image
            source={{ uri: IMAGE_PREFETCH_URL }}
            style={[styles.base, { overflow: 'visible' }]}
            onLoadStart={() => this._loadEventFired(`✔ (prefetched) onLoadStart (+${new Date() - mountTime}ms)`)}
            onLoad={(event) => {
              // Currently this image source feature is only available on iOS.
              if (event.nativeEvent.source) {
                const url = event.nativeEvent.source.url;
                this._loadEventFired(`✔ (prefetched) onLoad (+${new Date() - mountTime}ms) for URL ${url}`);
              } else {
                this._loadEventFired(`✔ (prefetched) onLoad (+${new Date() - mountTime}ms)`);
              }
            }}
            onLoadEnd={() => this._loadEventFired(`✔ (prefetched) onLoadEnd (+${new Date() - mountTime}ms)`)}
          />
          : null}
        <Text style={{marginTop: 20}}>
          {this.state.events.join('\n')}
        </Text>
      </View>
    );
  }

  _loadEventFired = (event) => {
    this.setState((state) => {
      return state.events = [...state.events, event];
    });
  }

}

var styles = StyleSheet.create({
  base: {
    width: 38,
    height: 38,
  },
});
*/
