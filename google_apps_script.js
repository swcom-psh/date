function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  try {
    var data = JSON.parse(e.postData.contents);
    var name = data.name; // 사용자 이름 (예: "상현", "창민")
    var date = data.date; // 날짜 (형식: "YYYY-MM-DD" 또는 "M/D"에 매핑할 수 있는 문자열)
    var status = data.status; // 참석여부 ("available", "maybe", "unavailable", 또는 선택해제인 경우 null/undefined/"" 등)

    if (!name || !date) {
      return ContentService.createTextOutput(JSON.stringify({
        result: "error",
        message: "Missing name or date"
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 1. 구글 시트의 첫 번째 행(Header)에서 해당 날짜 컬럼 인덱스 찾기
    // 시트 날짜 형식 매핑 예: "2026-07-01" -> "7/1", "2026-08-15" -> "8/15"
    var formattedDate = convertDateToHeaderFormat(date);

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var colIndex = -1;
    for (var i = 0; i < headers.length; i++) {
      // ★ 헤더 셀이 Date 객체일 수 있으므로 headerCellToString으로 안전하게 변환
      var headerVal = headerCellToString(headers[i]);
      // "7/1(수" 등 괄호가 붙어 있는 경우가 있으므로 startWith 등으로 유연하게 비교합니다.
      if (headerVal.indexOf(formattedDate) === 0 || headerVal === formattedDate) {
        colIndex = i + 1; // 1-based index
        break;
      }
    }

    if (colIndex === -1) {
      return ContentService.createTextOutput(JSON.stringify({
        result: "error",
        message: "Date column not found: " + formattedDate
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. 구글 시트의 첫 번째 열(A열)에서 사용자 이름 행 인덱스 찾기
    // ★ 버그 수정: 헤더 행(1행)을 포함해 검색하면 만약 이름이 헤더 셀과 일치할 경우 1행(헤더)를 덮어쓸 위험이 있음.
    // 2행(첫 번째 데이터 행)부터 검색하도록 수정.
    var lastRowNow = sheet.getLastRow();
    var nameValues = lastRowNow > 1
      ? sheet.getRange(2, 1, lastRowNow - 1, 1).getValues()
      : [];
    var rowIndex = -1;
    for (var j = 0; j < nameValues.length; j++) {
      if (nameValues[j][0].toString().trim() === name.trim()) {
        rowIndex = j + 2; // 1-based, 2행부터 검색했으므로 j=0 → row 2
        break;
      }
    }

    // 만약 사용자가 행에 없으면 마지막에 추가합니다.
    if (rowIndex === -1) {
      sheet.appendRow([name]);
      rowIndex = sheet.getLastRow();
    }

    // 3. 참석이면 1, 미정이면 0.5 (또는 빈값), 불가/선택해제면 빈값 표시
    var displayValue = "";
    if (status === "available") {
      displayValue = 1;
    } else if (status === "maybe") {
      displayValue = ""; // 미정도 1이 아니면 빈값으로 비워둠 (원할 경우 "0.5" 등으로 설정 가능하나, 요구사항은 "참석이면 1로 표시")
    } else {
      displayValue = "";
    }

    // 셀 값 업데이트
    sheet.getRange(rowIndex, colIndex).setValue(displayValue);

    return ContentService.createTextOutput(JSON.stringify({
      result: "success",
      name: name,
      date: formattedDate,
      rowIndex: rowIndex,
      colIndex: colIndex,
      value: displayValue
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// "2026-07-01" 형식을 "7/1"로 변환하는 헬퍼 함수
function convertDateToHeaderFormat(dateStr) {
  // dateStr: "2026-07-01"
  var parts = dateStr.split("-");
  if (parts.length === 3) {
    var month = parseInt(parts[1], 10);
    var day = parseInt(parts[2], 10);
    return month + "/" + day; // 예: "7/1"
  }
  return dateStr;
}

// ★ 헤더 셀이 Date 객체(구글 시트가 날짜 형식으로 저장한 경우)를 심쬠하면 "M/D" 형식으로 변환
// Google Sheets에서 헤더 셀을 일반 텍스트로 입력하지 않으면 Date 객체로 저장되고
// .toString()은 "Thu Jul 01 2021..." 같은 문자열이 돼 매칭이 실패됨.
function headerCellToString(cell) {
  if (cell instanceof Date) {
    // Date 객체에서 직접 "M/D" 형식으로 변환 (영향받지 않는 안전한 방법)
    return (cell.getMonth() + 1) + "/" + cell.getDate();
  }
  return cell.toString().trim();
}

// 4. 구글 시트에서 참석 데이터를 조회하여 프론트엔드로 전달하는 doGet 핸들러
function doGet(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  try {
    var lastRow = sheet.getLastRow();
    var lastCol = sheet.getLastColumn();

    if (lastRow < 2 || lastCol < 2) {
      return ContentService.createTextOutput(JSON.stringify({
        availability: {}
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 헤더(날짜 컬럼) 읽기: 1행 2열부터 끝 컬럼까지
    var headers = sheet.getRange(1, 2, 1, lastCol - 1).getValues()[0];

    // A열(참석자 이름) 읽기: 2행 1열부터 끝 행까지
    var nameValues = sheet.getRange(2, 1, lastRow - 1, 1).getValues();

    // 참석 여부 셀 데이터 전체 읽기: 2행 2열부터
    var dataMatrix = sheet.getRange(2, 2, lastRow - 1, lastCol - 1).getValues();

    var availability = {};

    // 날짜 헤더 변환 및 매핑 (예: "7/1(수)" 또는 Date 객체 -> "2026-07-01")
    var dateMapping = [];
    for (var i = 0; i < headers.length; i++) {
      // ★ 헤더 셀이 Date 객체일 수 있으므로 headerCellToString으로 안전하게 변환
      var headerStr = headerCellToString(headers[i]);
      var match = headerStr.match(/(\d+)\/(\d+)/);
      if (match) {
        var m = match[1];
        var d = match[2];
        var dateStr = "2026-" + (m.length === 1 ? "0" + m : m) + "-" + (d.length === 1 ? "0" + d : d);
        dateMapping.push(dateStr);
      } else {
        dateMapping.push(null);
      }
    }

    // 매핑 데이터 파싱
    for (var r = 0; r < nameValues.length; r++) {
      var name = nameValues[r][0].toString().trim();
      if (!name) continue;

      for (var c = 0; c < headers.length; c++) {
        var dateStr = dateMapping[c];
        if (!dateStr) continue;

        var cellVal = dataMatrix[r][c];
        if (cellVal == 1 || cellVal == "1") {
          if (!availability[dateStr]) {
            availability[dateStr] = {};
          }
          availability[dateStr][name] = "available";
        }
      }
    }

    return ContentService.createTextOutput(JSON.stringify({
      availability: availability
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      result: "error",
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}
