import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:tester/widgets/index.dart';

class ImagePickerPage extends StatelessWidget {
  static final Demo demo = Demo(
    name: 'Image Picker',
    builder: (BuildContext context) => ImagePickerPage(),
  );

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text("Image Picker"),
      ),
      body: Center(
        child: GestureDetector(
          onTap: () async {
            final ImagePicker picker = ImagePicker();
            // Pick an image.
            final XFile? image = await picker.pickImage(source: ImageSource.gallery);
            // // Capture a photo.
            // final XFile? photo = await picker.pickImage(source: ImageSource.camera);
            // // Pick a video.
            // final XFile? galleryVideo = await picker.pickVideo(source: ImageSource.gallery);
            // // Capture a video.
            // final XFile? cameraVideo = await picker.pickVideo(source: ImageSource.camera);
            // // Pick multiple images.
            // final List<XFile> images = await picker.pickMultiImage();
            // // Pick singe image or video.
            // final XFile? media = await picker.pickMedia();
            // // Pick multiple images and videos.
            // final List<XFile> medias = await picker.pickMultipleMedia();
          },
          child: Text('pick...'),
        ),
      ),
    );
  }
}
