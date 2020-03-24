import 'package:http/http.dart' as http;

void main() async {
  await test200();
  await test400();
  await test500();
  await testWrong();
}

void test200() async {
  print('>> 200');
  try {
    http.Response response =
        await http.get('http://www.mocky.io/v2/5e7a15333000008975930687');
    print('status: ${response.statusCode}');
    print('body: ${response.body}');
  } catch (e) {
    print(e);
  }
}

void test400() async {
  print('>> 400');
  try {
    http.Response response =
        await http.get('http://www.mocky.io/v2/5e7a1a8e30000078009306f3');
    print('status: ${response.statusCode}');
    print('body: ${response.body}');
  } catch (e) {
    print(e);
  }
}

void test500() async {
  print('>> 500');
  try {
    http.Response response =
        await http.get('http://www.mocky.io/v2/5e7a1ad730000097009306f6');
    print('status: ${response.statusCode}');
    print('body: ${response.body}');
  } catch (e) {
    print(e);
  }
}

void testWrong() async {
  print('>> wrong');
  try {
    http.Response response =
        await http.get('http://www.abcd.efg');
    print('status: ${response.statusCode}');
    print('body: ${response.body}');
  } catch (e) {
    // SocketException: Failed host lookup: 'www.abcd.efg' (OS Error: 不知道这样的主机。errno = 11001)
    print(e);
  }
}
