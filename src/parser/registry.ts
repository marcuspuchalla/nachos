/** Generated from the pinned IANA registry (2026-07-20). Names do not imply semantic validation. */
export interface TagDefinition { start: string; end: string; name: string; content: string; references: string[] }
export const TAG_REGISTRY_UPDATED = '2026-07-20'
export const TAG_DEFINITIONS: readonly TagDefinition[] = [
  {
    "start": "0",
    "end": "0",
    "name": "Standard date/time string; see Section 3.4.1",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8949.html"
    ]
  },
  {
    "start": "1",
    "end": "1",
    "name": "Epoch-based date/time; see Section 3.4.2",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8949.html"
    ]
  },
  {
    "start": "2",
    "end": "2",
    "name": "Unsigned bignum; see Section 3.4.3",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8949.html"
    ]
  },
  {
    "start": "3",
    "end": "3",
    "name": "Negative bignum; see Section 3.4.3",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8949.html"
    ]
  },
  {
    "start": "4",
    "end": "4",
    "name": "Decimal fraction; see Section 3.4.4",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8949.html"
    ]
  },
  {
    "start": "5",
    "end": "5",
    "name": "Bigfloat; see Section 3.4.4",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8949.html"
    ]
  },
  {
    "start": "6",
    "end": "15",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "16",
    "end": "16",
    "name": "COSE Single Recipient Encrypted Data Object",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9052.html"
    ]
  },
  {
    "start": "17",
    "end": "17",
    "name": "COSE Mac w/o Recipients Object",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9052.html"
    ]
  },
  {
    "start": "18",
    "end": "18",
    "name": "COSE Single Signer Data Object",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9052.html"
    ]
  },
  {
    "start": "19",
    "end": "19",
    "name": "COSE standalone V2 countersignature",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9338.html"
    ]
  },
  {
    "start": "20",
    "end": "20",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "21",
    "end": "21",
    "name": "Expected conversion to base64url encoding; see Section 3.4.5.2",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8949.html"
    ]
  },
  {
    "start": "22",
    "end": "22",
    "name": "Expected conversion to base64 encoding; see Section 3.4.5.2",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8949.html"
    ]
  },
  {
    "start": "23",
    "end": "23",
    "name": "Expected conversion to base16 encoding; see Section 3.4.5.2",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8949.html"
    ]
  },
  {
    "start": "24",
    "end": "24",
    "name": "Encoded CBOR data item; see Section 3.4.5.1",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8949.html"
    ]
  },
  {
    "start": "25",
    "end": "25",
    "name": "reference the nth previously seen string",
    "content": "",
    "references": [
      "http://cbor.schmorp.de/stringref",
      "Marc_A._Lehmann"
    ]
  },
  {
    "start": "26",
    "end": "26",
    "name": "Serialised Perl object with classname and constructor arguments",
    "content": "",
    "references": [
      "http://cbor.schmorp.de/perl-object",
      "Marc_A._Lehmann"
    ]
  },
  {
    "start": "27",
    "end": "27",
    "name": "Serialised language-independent object with type name and constructor arguments",
    "content": "",
    "references": [
      "http://cbor.schmorp.de/generic-object",
      "Marc_A._Lehmann"
    ]
  },
  {
    "start": "28",
    "end": "28",
    "name": "mark value as (potentially) shared",
    "content": "",
    "references": [
      "http://cbor.schmorp.de/value-sharing",
      "Marc_A._Lehmann"
    ]
  },
  {
    "start": "29",
    "end": "29",
    "name": "reference nth marked value",
    "content": "",
    "references": [
      "http://cbor.schmorp.de/value-sharing",
      "Marc_A._Lehmann"
    ]
  },
  {
    "start": "30",
    "end": "30",
    "name": "Rational number",
    "content": "",
    "references": [
      "http://peteroupc.github.io/CBOR/rational.html",
      "Peter_Occil"
    ]
  },
  {
    "start": "31",
    "end": "31",
    "name": "Absent value in a CBOR Array",
    "content": "",
    "references": [
      "https://github.com/svaarala/cbor-specs/blob/master/cbor-absent-tag.rst",
      "Sami_Vaarala"
    ]
  },
  {
    "start": "32",
    "end": "32",
    "name": "URI; see Section 3.4.5.3",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8949.html"
    ]
  },
  {
    "start": "33",
    "end": "33",
    "name": "base64url; see Section 3.4.5.3",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8949.html"
    ]
  },
  {
    "start": "34",
    "end": "34",
    "name": "base64; see Section 3.4.5.3",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8949.html"
    ]
  },
  {
    "start": "35",
    "end": "35",
    "name": "Regular expression; see Section 2.4.4.3",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc7049.html"
    ]
  },
  {
    "start": "36",
    "end": "36",
    "name": "MIME message; see Section 3.4.5.3",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8949.html"
    ]
  },
  {
    "start": "37",
    "end": "37",
    "name": "Binary UUID (RFC9562, Section 4)",
    "content": "",
    "references": [
      "https://github.com/lucas-clemente/cbor-specs/blob/master/uuid.md",
      "Lucas_Clemente"
    ]
  },
  {
    "start": "38",
    "end": "38",
    "name": "Language-tagged string",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9290.html"
    ]
  },
  {
    "start": "39",
    "end": "39",
    "name": "Identifier",
    "content": "",
    "references": [
      "https://github.com/lucas-clemente/cbor-specs/blob/master/id.md",
      "Lucas_Clemente"
    ]
  },
  {
    "start": "40",
    "end": "40",
    "name": "Multi-dimensional Array, row-major order",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "41",
    "end": "41",
    "name": "Homogeneous Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "42",
    "end": "42",
    "name": "IPLD content identifier",
    "content": "",
    "references": [
      "https://github.com/ipld/cid-cbor/",
      "Volker_Mische"
    ]
  },
  {
    "start": "43",
    "end": "43",
    "name": "YANG bits datatype; see Section 6.7.",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9254.html"
    ]
  },
  {
    "start": "44",
    "end": "44",
    "name": "YANG enumeration datatype; see Section 6.6.",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9254.html"
    ]
  },
  {
    "start": "45",
    "end": "45",
    "name": "YANG identityref datatype; see Section 6.10.",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9254.html"
    ]
  },
  {
    "start": "46",
    "end": "46",
    "name": "YANG instance-identifier datatype; see Section 6.13.",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9254.html"
    ]
  },
  {
    "start": "47",
    "end": "47",
    "name": "YANG Schema Item iDentifier (sid); see Section 3.2.",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9254.html"
    ]
  },
  {
    "start": "48",
    "end": "48",
    "name": "IEEE MAC Address",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9542.html"
    ]
  },
  {
    "start": "49",
    "end": "51",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "52",
    "end": "52",
    "name": "IPv4, [prefixlen,IPv4], [IPv4,prefixpart]",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9164.html"
    ]
  },
  {
    "start": "53",
    "end": "53",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "54",
    "end": "54",
    "name": "IPv6, [prefixlen,IPv6], [IPv6,prefixpart]",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9164.html"
    ]
  },
  {
    "start": "55",
    "end": "57",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "58",
    "end": "58",
    "name": "An array claim element intended to be redacted, or a map key whose key and value are intended to be redacted. (TEMPORARY - registered 2025-12-09, expires 2026-12-09)",
    "content": "",
    "references": [
      "draft-ietf-spice-sd-cwt-06"
    ]
  },
  {
    "start": "59",
    "end": "59",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "60",
    "end": "60",
    "name": "A selective disclosure redacted (array) claim element. (TEMPORARY - registered 2025-12-09, expires 2026-12-09)",
    "content": "",
    "references": [
      "draft-ietf-spice-sd-cwt-06"
    ]
  },
  {
    "start": "61",
    "end": "61",
    "name": "CBOR Web Token (CWT)",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8392.html",
      "Michael_B._Jones"
    ]
  },
  {
    "start": "62",
    "end": "62",
    "name": "A marker of a location in a map or an array where a decoy is intended to be inserted. (TEMPORARY - registered 2026-01-27, expires 2027-01-27)",
    "content": "",
    "references": [
      "draft-ietf-spice-sd-cwt-06"
    ]
  },
  {
    "start": "63",
    "end": "63",
    "name": "Encoded CBOR Sequence",
    "content": "",
    "references": [
      "draft-bormann-cbor-notable-tags-02"
    ]
  },
  {
    "start": "64",
    "end": "64",
    "name": "uint8 Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "65",
    "end": "65",
    "name": "uint16, big endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "66",
    "end": "66",
    "name": "uint32, big endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "67",
    "end": "67",
    "name": "uint64, big endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "68",
    "end": "68",
    "name": "uint8 Typed Array, clamped arithmetic",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "69",
    "end": "69",
    "name": "uint16, little endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "70",
    "end": "70",
    "name": "uint32, little endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "71",
    "end": "71",
    "name": "uint64, little endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "72",
    "end": "72",
    "name": "sint8 Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "73",
    "end": "73",
    "name": "sint16, big endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "74",
    "end": "74",
    "name": "sint32, big endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "75",
    "end": "75",
    "name": "sint64, big endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "76",
    "end": "76",
    "name": "(reserved)",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "77",
    "end": "77",
    "name": "sint16, little endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "78",
    "end": "78",
    "name": "sint32, little endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "79",
    "end": "79",
    "name": "sint64, little endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "80",
    "end": "80",
    "name": "IEEE 754 binary16, big endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "81",
    "end": "81",
    "name": "IEEE 754 binary32, big endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "82",
    "end": "82",
    "name": "IEEE 754 binary64, big endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "83",
    "end": "83",
    "name": "IEEE 754 binary128, big endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "84",
    "end": "84",
    "name": "IEEE 754 binary16, little endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "85",
    "end": "85",
    "name": "IEEE 754 binary32, little endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "86",
    "end": "86",
    "name": "IEEE 754 binary64, little endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "87",
    "end": "87",
    "name": "IEEE 754 binary128, little endian, Typed Array",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "88",
    "end": "95",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "96",
    "end": "96",
    "name": "COSE Encrypted Data Object",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9052.html"
    ]
  },
  {
    "start": "97",
    "end": "97",
    "name": "COSE MACed Data Object",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9052.html"
    ]
  },
  {
    "start": "98",
    "end": "98",
    "name": "COSE Signed Data Object",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9052.html"
    ]
  },
  {
    "start": "99",
    "end": "99",
    "name": "CRI Reference",
    "content": "",
    "references": [
      "RFC-ietf-core-href-29"
    ]
  },
  {
    "start": "100",
    "end": "100",
    "name": "Number of days since the epoch date 1970-01-01",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8943.html"
    ]
  },
  {
    "start": "101",
    "end": "101",
    "name": "alternatives as given by the uint + 128; see Section 9.1",
    "content": "",
    "references": [
      "draft-bormann-cbor-notable-tags-07"
    ]
  },
  {
    "start": "102",
    "end": "102",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "103",
    "end": "103",
    "name": "Geographic Coordinates",
    "content": "",
    "references": [
      "https://github.com/allthingstalk/cbor/blob/master/CBOR-Tag103-Geographic-Coordinates.md",
      "Danilo_Vidovic"
    ]
  },
  {
    "start": "104",
    "end": "104",
    "name": "Geographic Coordinate Reference System WKT or EPSG number",
    "content": "",
    "references": [
      "draft-clarke-cbor-crs-01"
    ]
  },
  {
    "start": "105",
    "end": "106",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "107",
    "end": "107",
    "name": "SUIT_Envelope as defined in Appendix A of",
    "content": "",
    "references": [
      "RFC-ietf-suit-manifest-34"
    ]
  },
  {
    "start": "108",
    "end": "108",
    "name": "Expected conversion to base16 encoding (lowercase)",
    "content": "",
    "references": [
      "draft-bormann-cbor-notable-tags-12"
    ]
  },
  {
    "start": "109",
    "end": "109",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "110",
    "end": "110",
    "name": "relative object identifier (BER encoding); SDNV  sequence",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9090.html"
    ]
  },
  {
    "start": "111",
    "end": "111",
    "name": "object identifier (BER encoding)",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9090.html"
    ]
  },
  {
    "start": "112",
    "end": "112",
    "name": "object identifier (BER encoding), relative to 1.3.6.1.4.1",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9090.html"
    ]
  },
  {
    "start": "113",
    "end": "119",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "120",
    "end": "120",
    "name": "Internet of Things Data Point",
    "content": "",
    "references": [
      "https://github.com/allthingstalk/cbor/blob/master/CBOR-Tag120-Internet-of-Things-Data-Points.md",
      "Danilo_Vidovic"
    ]
  },
  {
    "start": "121",
    "end": "127",
    "name": "alternatives 0..6, 1+1 encoding; see Section 9.1",
    "content": "",
    "references": [
      "draft-bormann-cbor-notable-tags-07"
    ]
  },
  {
    "start": "128",
    "end": "199",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "200",
    "end": "200",
    "name": "Gordian Envelope",
    "content": "",
    "references": [
      "draft-mcnally-envelope-05"
    ]
  },
  {
    "start": "201",
    "end": "201",
    "name": "enclosed dCBOR",
    "content": "",
    "references": [
      "draft-mcnally-deterministic-cbor-10"
    ]
  },
  {
    "start": "202",
    "end": "255",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "256",
    "end": "256",
    "name": "mark value as having string references",
    "content": "",
    "references": [
      "http://cbor.schmorp.de/stringref",
      "Marc_A._Lehmann"
    ]
  },
  {
    "start": "257",
    "end": "257",
    "name": "Binary MIME message",
    "content": "",
    "references": [
      "http://peteroupc.github.io/CBOR/binarymime.html",
      "Peter_Occil"
    ]
  },
  {
    "start": "258",
    "end": "258",
    "name": "Mathematical finite set",
    "content": "",
    "references": [
      "https://github.com/input-output-hk/cbor-sets-spec/blob/master/CBOR_SETS.md",
      "Alfredo_Di_Napoli"
    ]
  },
  {
    "start": "259",
    "end": "259",
    "name": "Map datatype with key-value operations (e.g. `.get()/.set()/.delete()`)",
    "content": "",
    "references": [
      "https://github.com/shanewholloway/js-cbor-codec/blob/master/docs/CBOR-259-spec--explicit-maps.md",
      "Shane_Holloway"
    ]
  },
  {
    "start": "260",
    "end": "260",
    "name": "Network Address (IPv4 or IPv6 or MAC Address) (DEPRECATED in favor of 52 and 54\n        for IP addresses)",
    "content": "",
    "references": [
      "http://www.employees.org/~ravir/cbor-network.txt",
      "Ravi_Raju",
      "https://www.rfc-editor.org/rfc/rfc9164.html"
    ]
  },
  {
    "start": "261",
    "end": "261",
    "name": "Network Address Prefix (IPv4 or IPv6 Address + Mask Length) (DEPRECATED in favor of 52 and 54\n        for IP addresses)",
    "content": "",
    "references": [
      "https://github.com/toravir/CBOR-Tag-Specs/blob/master/networkPrefix.md",
      "Ravi_Raju",
      "https://www.rfc-editor.org/rfc/rfc9164.html"
    ]
  },
  {
    "start": "262",
    "end": "262",
    "name": "Embedded JSON Object",
    "content": "",
    "references": [
      "https://github.com/toravir/CBOR-Tag-Specs/blob/master/embeddedJSON.md",
      "Ravi_Raju"
    ]
  },
  {
    "start": "263",
    "end": "263",
    "name": "Hexadecimal string",
    "content": "",
    "references": [
      "https://github.com/toravir/CBOR-Tag-Specs/blob/master/hexString.md",
      "Ravi_Raju"
    ]
  },
  {
    "start": "264",
    "end": "264",
    "name": "Decimal fraction with arbitrary exponent",
    "content": "",
    "references": [
      "http://peteroupc.github.io/CBOR/bigfrac.html",
      "Peter_Occil"
    ]
  },
  {
    "start": "265",
    "end": "265",
    "name": "Bigfloat with arbitrary exponent",
    "content": "",
    "references": [
      "http://peteroupc.github.io/CBOR/bigfrac.html",
      "Peter_Occil"
    ]
  },
  {
    "start": "266",
    "end": "266",
    "name": "Internationalized resource identifier (IRI)",
    "content": "",
    "references": [
      "https://peteroupc.github.io/CBOR/iri.html",
      "Peter_Occil"
    ]
  },
  {
    "start": "267",
    "end": "267",
    "name": "Internationalized resource identifier reference (IRI reference)",
    "content": "",
    "references": [
      "https://peteroupc.github.io/CBOR/iri.html",
      "Peter_Occil"
    ]
  },
  {
    "start": "268",
    "end": "268",
    "name": "Extended decimal fraction",
    "content": "",
    "references": [
      "https://peteroupc.github.io/CBOR/extended.html",
      "Peter_Occil"
    ]
  },
  {
    "start": "269",
    "end": "269",
    "name": "Extended bigfloat",
    "content": "",
    "references": [
      "https://peteroupc.github.io/CBOR/extended.html",
      "Peter_Occil"
    ]
  },
  {
    "start": "270",
    "end": "270",
    "name": "Extended rational number",
    "content": "",
    "references": [
      "https://peteroupc.github.io/CBOR/extended.html",
      "Peter_Occil"
    ]
  },
  {
    "start": "271",
    "end": "271",
    "name": "DDoS Open Threat Signaling (DOTS) signal channel object, \n        as defined in",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9132.html"
    ]
  },
  {
    "start": "272",
    "end": "272",
    "name": "Non-UTF-8 CESU-8 string",
    "content": "",
    "references": [
      "https://github.com/svaarala/cbor-specs/blob/master/cbor-nonutf8-string-tags.rst",
      "Sami_Vaarala"
    ]
  },
  {
    "start": "273",
    "end": "273",
    "name": "Non-UTF-8 WTF-8 string",
    "content": "",
    "references": [
      "https://github.com/svaarala/cbor-specs/blob/master/cbor-nonutf8-string-tags.rst",
      "Sami_Vaarala"
    ]
  },
  {
    "start": "274",
    "end": "274",
    "name": "Non-UTF-8 MUTF-8 string",
    "content": "",
    "references": [
      "https://github.com/svaarala/cbor-specs/blob/master/cbor-nonutf8-string-tags.rst",
      "Sami_Vaarala"
    ]
  },
  {
    "start": "275",
    "end": "275",
    "name": "Map contains only keys that are of type Text String (major type 3)",
    "content": "",
    "references": [
      "https://github.com/ecorm/cbor-tag-text-key-map",
      "Emile_Cormier"
    ]
  },
  {
    "start": "276",
    "end": "276",
    "name": "ERIS binary read capability",
    "content": "",
    "references": [
      "http://purl.org/eris"
    ]
  },
  {
    "start": "277",
    "end": "277",
    "name": "Universal Geographical Area Description (GAD) shape; see Section 5",
    "content": "",
    "references": [
      "https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=742",
      "Mathew_Meins"
    ]
  },
  {
    "start": "278",
    "end": "278",
    "name": "Universal Geographical Area Description (GAD) description of velocity; see Section 8",
    "content": "",
    "references": [
      "https://portal.3gpp.org/desktopmodules/Specifications/SpecificationDetails.aspx?specificationId=742",
      "Mathew_Meins"
    ]
  },
  {
    "start": "279",
    "end": "279",
    "name": "Coordinate Reference System Wrapper",
    "content": "",
    "references": [
      "https://shop.cta.tech/collections/standards/products/fast-and-readable-geographical-hashing-cta-5009",
      "Consumer_Technology_Association"
    ]
  },
  {
    "start": "280",
    "end": "280",
    "name": "Symbol",
    "content": "",
    "references": [
      "https://github.com/mishoo/cbor.lisp/blob/e1428a5/clext-spec.txt",
      "Mihai_Bazon"
    ]
  },
  {
    "start": "281",
    "end": "281",
    "name": "Linked list",
    "content": "",
    "references": [
      "https://github.com/mishoo/cbor.lisp/blob/e1428a5/clext-spec.txt",
      "Mihai_Bazon"
    ]
  },
  {
    "start": "282",
    "end": "282",
    "name": "Character",
    "content": "",
    "references": [
      "https://github.com/mishoo/cbor.lisp/blob/e1428a5/clext-spec.txt",
      "Mihai_Bazon"
    ]
  },
  {
    "start": "283",
    "end": "283",
    "name": "Object",
    "content": "",
    "references": [
      "https://github.com/mishoo/cbor.lisp/blob/e1428a5/clext-spec.txt",
      "Mihai_Bazon"
    ]
  },
  {
    "start": "284",
    "end": "284",
    "name": "JSON Numeric Value, Represented as its JSON Text",
    "content": "",
    "references": [
      "https://gist.github.com/theory/ef667af1c725240e6e30d525786d58e6",
      "David_Wheeler"
    ]
  },
  {
    "start": "285",
    "end": "285",
    "name": "SUIT_Report_Protected",
    "content": "",
    "references": [
      "RFC-ietf-suit-report-19"
    ]
  },
  {
    "start": "286",
    "end": "286",
    "name": "SUIT_Reference",
    "content": "",
    "references": [
      "RFC-ietf-suit-report-19"
    ]
  },
  {
    "start": "287",
    "end": "287",
    "name": "SUIT_Capability_Report",
    "content": "",
    "references": [
      "RFC-ietf-suit-report-19"
    ]
  },
  {
    "start": "288",
    "end": "295",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "296",
    "end": "296",
    "name": "isolate shared values within this scope",
    "content": "",
    "references": [
      "https://cbor.is4.site/sharedref-namespace",
      "IS4"
    ]
  },
  {
    "start": "297",
    "end": "300",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "301",
    "end": "301",
    "name": "Geohash String",
    "content": "",
    "references": [
      "https://shop.cta.tech/collections/standards/products/fast-and-readable-geographical-hashing-cta-5009",
      "Consumer_Technology_Association"
    ]
  },
  {
    "start": "302",
    "end": "499",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "500",
    "end": "500",
    "name": "Earmarked for CoRIM",
    "content": "",
    "references": [
      "draft-ietf-rats-corim-07"
    ]
  },
  {
    "start": "501",
    "end": "501",
    "name": "A CBOR tag that contains a corim-map.",
    "content": "",
    "references": [
      "https://trustedcomputinggroup.org/wp-content/uploads/TCG-Endorsement-Architecture-for-Devices-V1-R38_pub.pdf",
      "https://trustedcomputinggroup.org/wp-content/uploads/Errata-for-DICE-Endorsement-Architecture-for-Devices-Version-1.1-Revision1_pub.pdf",
      "TCG"
    ]
  },
  {
    "start": "502",
    "end": "504",
    "name": "Earmarked for CoRIM",
    "content": "",
    "references": [
      "draft-ietf-rats-corim-07"
    ]
  },
  {
    "start": "505",
    "end": "505",
    "name": "A CBOR tag that contains a conciseswid-tag-map.",
    "content": "",
    "references": [
      "https://trustedcomputinggroup.org/wp-content/uploads/TCG-Endorsement-Architecture-for-Devices-V1-R38_pub.pdf",
      "https://trustedcomputinggroup.org/wp-content/uploads/Errata-for-DICE-Endorsement-Architecture-for-Devices-Version-1.1-Revision1_pub.pdf",
      "TCG"
    ]
  },
  {
    "start": "506",
    "end": "506",
    "name": "A CBOR tag that contains a concisemid-tag-map.",
    "content": "",
    "references": [
      "https://trustedcomputinggroup.org/wp-content/uploads/TCG-Endorsement-Architecture-for-Devices-V1-R38_pub.pdf",
      "https://trustedcomputinggroup.org/wp-content/uploads/Errata-for-DICE-Endorsement-Architecture-for-Devices-Version-1.1-Revision1_pub.pdf",
      "TCG"
    ]
  },
  {
    "start": "507",
    "end": "525",
    "name": "Earmarked for CoRIM",
    "content": "",
    "references": [
      "draft-ietf-rats-corim-07"
    ]
  },
  {
    "start": "526",
    "end": "526",
    "name": "A CBOR tag that contains an xcorim-map.",
    "content": "",
    "references": [
      "https://trustedcomputinggroup.org/wp-content/uploads/TCG-Endorsement-Architecture-for-Devices-V1-R38_pub.pdf",
      "https://trustedcomputinggroup.org/wp-content/uploads/Errata-for-DICE-Endorsement-Architecture-for-Devices-Version-1.1-Revision1_pub.pdf",
      "TCG"
    ]
  },
  {
    "start": "527",
    "end": "527",
    "name": "A CBOR tag that contains either: xcorimmap, or signed-xcorim.",
    "content": "",
    "references": [
      "https://trustedcomputinggroup.org/wp-content/uploads/TCG-Endorsement-Architecture-for-Devices-V1-R38_pub.pdf",
      "https://trustedcomputinggroup.org/wp-content/uploads/Errata-for-DICE-Endorsement-Architecture-for-Devices-Version-1.1-Revision1_pub.pdf",
      "TCG"
    ]
  },
  {
    "start": "528",
    "end": "549",
    "name": "Earmarked for CoRIM",
    "content": "",
    "references": [
      "draft-ietf-rats-corim-07"
    ]
  },
  {
    "start": "550",
    "end": "550",
    "name": "A CBOR tag that contains a UEID between 7 and 33 bytes.",
    "content": "",
    "references": [
      "https://trustedcomputinggroup.org/wp-content/uploads/TCG-Endorsement-Architecture-for-Devices-V1-R38_pub.pdf",
      "https://trustedcomputinggroup.org/wp-content/uploads/Errata-for-DICE-Endorsement-Architecture-for-Devices-Version-1.1-Revision1_pub.pdf",
      "TCG"
    ]
  },
  {
    "start": "551",
    "end": "551",
    "name": "Earmarked for CoRIM",
    "content": "",
    "references": [
      "draft-ietf-rats-corim-07"
    ]
  },
  {
    "start": "552",
    "end": "552",
    "name": "A CBOR tag that contains a security version number that is evaluated with equivalence semantics.",
    "content": "",
    "references": [
      "https://trustedcomputinggroup.org/wp-content/uploads/TCG-Endorsement-Architecture-for-Devices-V1-R38_pub.pdf",
      "https://trustedcomputinggroup.org/wp-content/uploads/Errata-for-DICE-Endorsement-Architecture-for-Devices-Version-1.1-Revision1_pub.pdf",
      "TCG"
    ]
  },
  {
    "start": "553",
    "end": "553",
    "name": "A CBOR tag that contains min-svn that identifies a security version number that is evaluated with greater than or equals semantics",
    "content": "",
    "references": [
      "https://trustedcomputinggroup.org/wp-content/uploads/TCG-Endorsement-Architecture-for-Devices-V1-R38_pub.pdf",
      "https://trustedcomputinggroup.org/wp-content/uploads/Errata-for-DICE-Endorsement-Architecture-for-Devices-Version-1.1-Revision1_pub.pdf",
      "TCG"
    ]
  },
  {
    "start": "554",
    "end": "554",
    "name": "A CBOR tag that contains a PEM encoded SubjectPublicKeyInfo. See Section 13 of .",
    "content": "",
    "references": [
      "https://trustedcomputinggroup.org/wp-content/uploads/TCG-Endorsement-Architecture-for-Devices-V1-R38_pub.pdf",
      "https://trustedcomputinggroup.org/wp-content/uploads/Errata-for-DICE-Endorsement-Architecture-for-Devices-Version-1.1-Revision1_pub.pdf",
      "TCG"
    ]
  },
  {
    "start": "555",
    "end": "555",
    "name": "A CBOR tag that contains a PEM encoded SubjectPublicKeyInfo. See Section 13 of .",
    "content": "",
    "references": [
      "https://trustedcomputinggroup.org/wp-content/uploads/TCG-Endorsement-Architecture-for-Devices-V1-R38_pub.pdf",
      "https://trustedcomputinggroup.org/wp-content/uploads/Errata-for-DICE-Endorsement-Architecture-for-Devices-Version-1.1-Revision1_pub.pdf",
      "TCG"
    ]
  },
  {
    "start": "556",
    "end": "556",
    "name": "A CBOR tag that contains an X.509 certificate chain created by the concatenation of as many PEM encoded X.509 certificates as needed. The certificates MUST be concatenated in order that each directly certifies the one preceding.",
    "content": "",
    "references": [
      "https://trustedcomputinggroup.org/wp-content/uploads/TCG-Endorsement-Architecture-for-Devices-V1-R38_pub.pdf",
      "https://trustedcomputinggroup.org/wp-content/uploads/Errata-for-DICE-Endorsement-Architecture-for-Devices-Version-1.1-Revision1_pub.pdf",
      "TCG"
    ]
  },
  {
    "start": "557",
    "end": "559",
    "name": "Earmarked for CoRIM",
    "content": "",
    "references": [
      "draft-ietf-rats-corim-07"
    ]
  },
  {
    "start": "560",
    "end": "560",
    "name": "A CBOR tag that contains a byte string interpreted as an array of bits.",
    "content": "",
    "references": [
      "https://trustedcomputinggroup.org/wp-content/uploads/TCG-Endorsement-Architecture-for-Devices-V1-R38_pub.pdf",
      "https://trustedcomputinggroup.org/wp-content/uploads/Errata-for-DICE-Endorsement-Architecture-for-Devices-Version-1.1-Revision1_pub.pdf",
      "TCG"
    ]
  },
  {
    "start": "561",
    "end": "569",
    "name": "Earmarked for CoRIM",
    "content": "",
    "references": [
      "draft-ietf-rats-corim-07"
    ]
  },
  {
    "start": "570",
    "end": "570",
    "name": "spdm-toc-map",
    "content": "",
    "references": [
      "https://trustedcomputinggroup.org/wp-content/uploads/TCG-DICE-Concise-Evidence-Binding-for-SPDM-Version-1.0-Revision-53_1August2023.pdf",
      "TCG"
    ]
  },
  {
    "start": "571",
    "end": "571",
    "name": "concise-evidence-map",
    "content": "",
    "references": [
      "https://trustedcomputinggroup.org/wp-content/uploads/TCG-DICE-Concise-Evidence-Binding-for-SPDM-Version-1.0-Revision-53_1August2023.pdf",
      "TCG"
    ]
  },
  {
    "start": "572",
    "end": "599",
    "name": "Earmarked for CoRIM",
    "content": "",
    "references": [
      "draft-ietf-rats-corim-07"
    ]
  },
  {
    "start": "600",
    "end": "600",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "601",
    "end": "601",
    "name": "Unprotected CWT Claims Set",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9781.html"
    ]
  },
  {
    "start": "602",
    "end": "602",
    "name": "Detached EAT Bundle",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9711.html"
    ]
  },
  {
    "start": "603",
    "end": "1000",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1001",
    "end": "1001",
    "name": "extended time",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9581.html"
    ]
  },
  {
    "start": "1002",
    "end": "1002",
    "name": "duration",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9581.html"
    ]
  },
  {
    "start": "1003",
    "end": "1003",
    "name": "period",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9581.html"
    ]
  },
  {
    "start": "1004",
    "end": "1004",
    "name": "full-date string",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8943.html"
    ]
  },
  {
    "start": "1005",
    "end": "1009",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1010",
    "end": "1010",
    "name": "Object type identifier",
    "content": "",
    "references": [
      "draft-rundgren-cotx-04"
    ]
  },
  {
    "start": "1011",
    "end": "1039",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1040",
    "end": "1040",
    "name": "Multi-dimensional Array, column-major order",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8746.html"
    ]
  },
  {
    "start": "1041",
    "end": "1047",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1048",
    "end": "1048",
    "name": "IEEE OUI/CID",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9542.html"
    ]
  },
  {
    "start": "1049",
    "end": "1069",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1070",
    "end": "1070",
    "name": "SUIT_Manifest as defined in Appendix A of",
    "content": "",
    "references": [
      "RFC-ietf-suit-manifest-34"
    ]
  },
  {
    "start": "1071",
    "end": "1279",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1280",
    "end": "1400",
    "name": "alternatives 7..127, 1+2 encoding; see Section 9.1",
    "content": "",
    "references": [
      "draft-bormann-cbor-notable-tags-07"
    ]
  },
  {
    "start": "1401",
    "end": "18299",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "18300",
    "end": "18555",
    "name": "Bare Hash value (COSE algorithm -256 to -1)",
    "content": "",
    "references": [
      "draft-bormann-cbor-notable-tags-09"
    ]
  },
  {
    "start": "18556",
    "end": "18556",
    "name": "[COSE algorithm identifier, Base Hash value]",
    "content": "",
    "references": [
      "draft-bormann-cbor-notable-tags-09"
    ]
  },
  {
    "start": "18557",
    "end": "18811",
    "name": "Bare Hash value (COSE algorithm 1 to 255)",
    "content": "",
    "references": [
      "draft-bormann-cbor-notable-tags-09"
    ]
  },
  {
    "start": "18812",
    "end": "20852",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "20853",
    "end": "20853",
    "name": "description of the value instead of the value itself",
    "content": "",
    "references": [
      "https://cbor.is4.site/quoted",
      "IS4"
    ]
  },
  {
    "start": "20854",
    "end": "21064",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "21065",
    "end": "21065",
    "name": "I-Regexp",
    "content": "",
    "references": [
      "draft-bormann-cbor-notable-tags-11",
      "https://www.rfc-editor.org/rfc/rfc9485.html"
    ]
  },
  {
    "start": "21066",
    "end": "21066",
    "name": "ECMAScript RegExp",
    "content": "",
    "references": [
      "https://github.com/hildjj/cbor-specs/blob/main/regexp.md",
      "Joe_Hildebrand"
    ]
  },
  {
    "start": "21067",
    "end": "21333",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "21334",
    "end": "21334",
    "name": "(always invalid in interchange) programming aid for simple values",
    "content": "",
    "references": [
      "draft-bormann-cbor-notable-tags-12"
    ]
  },
  {
    "start": "21335",
    "end": "21606",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "21607",
    "end": "21607",
    "name": "a CBOR Tag identifier",
    "content": "",
    "references": [
      "https://cbor.is4.site/cbor-tag",
      "IS4"
    ]
  },
  {
    "start": "21608",
    "end": "22097",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "22098",
    "end": "22098",
    "name": "hint that indicates an additional level of indirection",
    "content": "",
    "references": [
      "http://cbor.schmorp.de/indirection",
      "Marc_A._Lehmann"
    ]
  },
  {
    "start": "22099",
    "end": "25440",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "25441",
    "end": "25441",
    "name": "Capture [3]",
    "content": "",
    "references": [
      "https://github.com/japhb/cbor-specs/blob/main/capture.md",
      "Geoffrey_Broadwell"
    ]
  },
  {
    "start": "25442",
    "end": "32767",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "32768",
    "end": "32768",
    "name": "Identifier for a FHIR constant",
    "content": "",
    "references": [
      "Stefan_Genchev"
    ]
  },
  {
    "start": "32769",
    "end": "32769",
    "name": "External reference",
    "content": "",
    "references": [
      "https://gitlab.com/Hawk777/cbor-specs/-/blob/main/external-reference.md",
      "Christopher_Head"
    ]
  },
  {
    "start": "32770",
    "end": "32869",
    "name": "Used to mark pointers in PSA Crypto API IPC implementation",
    "content": "",
    "references": [
      "Ole_Saether"
    ]
  },
  {
    "start": "32870",
    "end": "32870",
    "name": "Logical operator: NONE / NOT. Encodes the logical operation (!item1&&!item2&&!item3&&..., if array), otherwise (!item).",
    "content": "",
    "references": [
      "Jon_Caruana"
    ]
  },
  {
    "start": "32871",
    "end": "32871",
    "name": "Logical operator: ANY. Encodes the logical operation (item1||item2||item3||...).",
    "content": "",
    "references": [
      "Jon_Caruana"
    ]
  },
  {
    "start": "32872",
    "end": "32872",
    "name": "Logical operator: ALL. Encodes the logical operation (item1&&item2&&item3&&...).",
    "content": "",
    "references": [
      "Jon_Caruana"
    ]
  },
  {
    "start": "32873",
    "end": "39999",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "40000",
    "end": "40000",
    "name": "ur:known-value, Semantic signifier",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40001",
    "end": "40001",
    "name": "ur:digest, 32-byte SHA-256 digest",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40002",
    "end": "40002",
    "name": "ur:encrypted, IETF ChaCha20-Poly1305 () encrypted message",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40003",
    "end": "40003",
    "name": "ur:compressed,  DEFLATE-compressed message",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40004",
    "end": "40004",
    "name": "ur:request, Transaction Request identifier",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40005",
    "end": "40005",
    "name": "ur:response, Transaction response identifier",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40006",
    "end": "40006",
    "name": "ur:function, Envelope expression function identifier",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40007",
    "end": "40007",
    "name": "ur:parameter, Envelope expression parameter identifier",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40008",
    "end": "40008",
    "name": "ur:placeholder, Envelope expression placeholder identifier",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40009",
    "end": "40009",
    "name": "ur:replacement, Envelope expression replacement identifier",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40010",
    "end": "40010",
    "name": "ur:agreement-private-key, Curve25519 private key for X25519 key agreement",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40011",
    "end": "40011",
    "name": "ur:agreement-public-key, Curve25519 public key for X25519 key agreement",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40012",
    "end": "40012",
    "name": "ur:arid, Apparently Random Identifier",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40013",
    "end": "40013",
    "name": "ur:crypto-prvkeys, Private keys for cryptographic operations",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40014",
    "end": "40014",
    "name": "ur:nonce, Cryptographic nonce",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40015",
    "end": "40015",
    "name": "ur:password, Scrypt-hashed password",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40016",
    "end": "40016",
    "name": "ur:crypto-prvkeys, Private key base (key material)",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40017",
    "end": "40017",
    "name": "ur:crypto-pubkeys, Public key base (signing and agreement public key bundle)",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40018",
    "end": "40018",
    "name": "ur:salt, Random salt used for hash tree decorrelation",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40019",
    "end": "40019",
    "name": "ur:crypto-sealed, Encrypted message and ephemeral public key",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40020",
    "end": "40020",
    "name": "ur:signature, Cryptographic signature",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40021",
    "end": "40021",
    "name": "ur:signing-private-key, Cryptographic private key used for signing",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40022",
    "end": "40022",
    "name": "ur:signing-public-key, Cryptographic public key used for signing",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40023",
    "end": "40023",
    "name": "ur:crypto-key, Cryptographic key used for symmetric encryption",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40024",
    "end": "40024",
    "name": "ur:xid, Extensible identifier or XID Document",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40025",
    "end": "40025",
    "name": "ur:reference, Cryptographically secure reference to an object",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40026",
    "end": "40026",
    "name": "ur:event, Event identifier",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40027",
    "end": "40027",
    "name": "ur:encrypted-key, Content key encrypted with a derivation function",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40028",
    "end": "40099",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "40100",
    "end": "40100",
    "name": "ur:mlkem-private-key, Private key for MLKEM key encapsulation",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40101",
    "end": "40101",
    "name": "ur:mlkem-public-key, Public key for MLKEM key encapsulation",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40102",
    "end": "40102",
    "name": "ur:mlkem-ciphertext, Ciphertext for MLKEM key encapsulation",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40103",
    "end": "40103",
    "name": "ur:mldsa-private-key, Private key for MLDSA signature generation",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40104",
    "end": "40104",
    "name": "ur:mldsa-public-key, Public key for MLDSA signature verification",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40105",
    "end": "40105",
    "name": "ur:mldsa-signature, MLDSA signature",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40106",
    "end": "40299",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "40300",
    "end": "40300",
    "name": "ur:seed, Cryptographic seed",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40301",
    "end": "40302",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "40303",
    "end": "40303",
    "name": "ur:hdkey, Bitcoin BIP-32 HD key",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40304",
    "end": "40304",
    "name": "ur:keypath, Bitcoin BIP-32 key derivation path",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40305",
    "end": "40305",
    "name": "ur:coin-info, Cryptographic asset and network specifier",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40306",
    "end": "40306",
    "name": "ur:eckey, Bitcoin elliptic curve key (private or public)",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40307",
    "end": "40307",
    "name": "ur:address, Cryptocurrency address",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40308",
    "end": "40308",
    "name": "ur:output-descriptor, Bitcoin output descriptor",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40309",
    "end": "40309",
    "name": "ur:sskr, Sharded Secret Key Reconstruction (SSKR) share",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40310",
    "end": "40310",
    "name": "ur:psbt, Partially Signed Bitcoin Transaction",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40311",
    "end": "40311",
    "name": "ur:account-descriptor, Bitcoin account descriptor",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40312",
    "end": "40799",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "40800",
    "end": "40800",
    "name": "ur:ssh-private, Text format SSH private key",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40801",
    "end": "40801",
    "name": "ur:ssh-public, Text format SSH public key",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40802",
    "end": "40802",
    "name": "ur:ssh-signature, Text format SSH signature",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40803",
    "end": "40803",
    "name": "ur:ssh-certificate, Text format SSH certificate",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "40804",
    "end": "40918",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "40919",
    "end": "40919",
    "name": "Concordium smart contract address",
    "content": "",
    "references": [
      "https://proposals.concordium.com/CIS/cis-7.html#smart-contract-address",
      "Thomas_Dinsdale-Young"
    ]
  },
  {
    "start": "40920",
    "end": "41727",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "41728",
    "end": "41728",
    "name": "Fraction",
    "content": "",
    "references": [
      "https://medyro.eu/specification/IANA/CBOR%20Tags/Fraction/",
      "Medyro"
    ]
  },
  {
    "start": "41729",
    "end": "41729",
    "name": "Fraction (-NaN signals)",
    "content": "",
    "references": [
      "https://medyro.eu/specification/IANA/CBOR%20Tags/Fraction/",
      "Medyro"
    ]
  },
  {
    "start": "41730",
    "end": "41730",
    "name": "Fraction (+NaN signals)",
    "content": "",
    "references": [
      "https://medyro.eu/specification/IANA/CBOR%20Tags/Fraction/",
      "Medyro"
    ]
  },
  {
    "start": "41731",
    "end": "41731",
    "name": "Fraction (Both NaNs signal)",
    "content": "",
    "references": [
      "https://medyro.eu/specification/IANA/CBOR%20Tags/Fraction/",
      "Medyro"
    ]
  },
  {
    "start": "41732",
    "end": "42599",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "42600",
    "end": "42600",
    "name": "A confidentiality clearance. The key value pairs of the map are defined in ADatP-4774.8",
    "content": "",
    "references": [
      "Aidan_Murdock"
    ]
  },
  {
    "start": "42601",
    "end": "42601",
    "name": "A metadata binding. The elements of the array are defined in AdatP-4778.8. \n        The tag is also used as part of the magic number in on-disk detached and encapsulating bindings.",
    "content": "",
    "references": [
      "Aidan_Murdock"
    ]
  },
  {
    "start": "42602",
    "end": "42602",
    "name": "A collection of NCMS metadata elements. The key value pairs of the map are defined in AdatP-5636.8",
    "content": "",
    "references": [
      "Aidan_Murdock"
    ]
  },
  {
    "start": "42603",
    "end": "42999",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "43000",
    "end": "43000",
    "name": "Single complex number: array elements are real (I) and imaginary (Q) components",
    "content": "",
    "references": [
      "Saajan_Chana"
    ]
  },
  {
    "start": "43001",
    "end": "43001",
    "name": "Array of complex numbers in interleaved form: complex value k is stored with real (I) part \nat array index 2k and imaginary (Q) part at index (2k + 1)",
    "content": "",
    "references": [
      "Saajan_Chana"
    ]
  },
  {
    "start": "43002",
    "end": "44251",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "44252",
    "end": "44252",
    "name": "Metrological value (quantity value with unit of measure, SI prefix and GUM measurement \nuncertainty)",
    "content": "",
    "references": [
      "https://github.com/OpenChargingTechnology/Whitepapers/blob/master/MetrologicalCBOR/README.md",
      "Achim_Friedland"
    ]
  },
  {
    "start": "44253",
    "end": "49999",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "50000",
    "end": "50000",
    "name": "PlatformV_IS_ID",
    "content": "",
    "references": [
      "https://github.com/arthurwangtz/platformv-cbor",
      "Wang_Tongzhou"
    ]
  },
  {
    "start": "50001",
    "end": "50001",
    "name": "PlatformV_IS_NAME",
    "content": "",
    "references": [
      "https://github.com/arthurwangtz/platformv-cbor",
      "Wang_Tongzhou"
    ]
  },
  {
    "start": "50002",
    "end": "50002",
    "name": "PlatformV_IS_VALUE",
    "content": "",
    "references": [
      "https://github.com/arthurwangtz/platformv-cbor",
      "Wang_Tongzhou"
    ]
  },
  {
    "start": "50003",
    "end": "50003",
    "name": "PlatformV_HAS_COMPOSITE_VALUE",
    "content": "",
    "references": [
      "https://github.com/arthurwangtz/platformv-cbor",
      "Wang_Tongzhou"
    ]
  },
  {
    "start": "50004",
    "end": "50004",
    "name": "PlatformV_HAS_MAPPED_VALUE",
    "content": "",
    "references": [
      "https://github.com/arthurwangtz/platformv-cbor",
      "Wang_Tongzhou"
    ]
  },
  {
    "start": "50005",
    "end": "50005",
    "name": "PlatformV_HAS_OBJ_ID",
    "content": "",
    "references": [
      "https://github.com/arthurwangtz/platformv-cbor",
      "Wang_Tongzhou"
    ]
  },
  {
    "start": "50006",
    "end": "50006",
    "name": "PlatformV_HAS_OBJ_TAG",
    "content": "",
    "references": [
      "https://github.com/arthurwangtz/platformv-cbor",
      "Wang_Tongzhou"
    ]
  },
  {
    "start": "50007",
    "end": "50007",
    "name": "PlatformV_HAS_CHILD",
    "content": "",
    "references": [
      "https://github.com/arthurwangtz/platformv-cbor",
      "Wang_Tongzhou"
    ]
  },
  {
    "start": "50008",
    "end": "50008",
    "name": "PlatformV_HAS_PROPERTY",
    "content": "",
    "references": [
      "https://github.com/arthurwangtz/platformv-cbor",
      "Wang_Tongzhou"
    ]
  },
  {
    "start": "50009",
    "end": "50009",
    "name": "PlatformV_HAS_META",
    "content": "",
    "references": [
      "https://github.com/arthurwangtz/platformv-cbor",
      "Wang_Tongzhou"
    ]
  },
  {
    "start": "50010",
    "end": "50010",
    "name": "PlatformV_HAS_EVENT",
    "content": "",
    "references": [
      "https://github.com/arthurwangtz/platformv-cbor",
      "Wang_Tongzhou"
    ]
  },
  {
    "start": "50011",
    "end": "50011",
    "name": "PlatformV_HAS_ACTION",
    "content": "",
    "references": [
      "https://github.com/arthurwangtz/platformv-cbor",
      "Wang_Tongzhou"
    ]
  },
  {
    "start": "50012",
    "end": "50012",
    "name": "PlatformV_IS_TYPE",
    "content": "",
    "references": [
      "https://github.com/arthurwangtz/platformv-cbor",
      "Wang_Tongzhou"
    ]
  },
  {
    "start": "50013",
    "end": "51996",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "51997",
    "end": "51997",
    "name": "A tag value of 51997 indicates that the payload is CBOR-LD.",
    "content": "",
    "references": [
      "https://json-ld.github.io/cbor-ld-spec/#cbor-tags-for-cbor-ld",
      "Wesley_Smith"
    ]
  },
  {
    "start": "51998",
    "end": "55798",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "55799",
    "end": "55799",
    "name": "Self-described CBOR; see Section 3.4.6",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8949.html"
    ]
  },
  {
    "start": "55800",
    "end": "55800",
    "name": "indicates that the file contains CBOR Sequences",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9277.html"
    ]
  },
  {
    "start": "55801",
    "end": "55801",
    "name": "indicates that the file starts with a CBOR-Labeled Non-CBOR Data label.",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9277.html"
    ]
  },
  {
    "start": "55802",
    "end": "56499",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "56500",
    "end": "56500",
    "name": "Compressed byte string",
    "content": "",
    "references": [
      "https://github.com/dectris/documentation/blob/main/cbor/dectris-compression-tag.md",
      "Dirk_Boye"
    ]
  },
  {
    "start": "56501",
    "end": "57341",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "57342",
    "end": "57342",
    "name": "Identify and define a set of record structures (each a sequence of \n        property names) that can be referenced as tags in the included value (and \n        the scope for the record tag definitions)",
    "content": "",
    "references": [
      "https://github.com/kriszyp/cbor-records",
      "Kris_Zyp"
    ]
  },
  {
    "start": "57343",
    "end": "57343",
    "name": "Identify and define a record structure (a sequence of property \n        names), and use that record structure definition to interpret the included \n        values.",
    "content": "",
    "references": [
      "https://github.com/kriszyp/cbor-records",
      "Kris_Zyp"
    ]
  },
  {
    "start": "57344",
    "end": "57599",
    "name": "References a defined record structure, using that referenced \n        record definition to interpret the included values.",
    "content": "",
    "references": [
      "https://github.com/kriszyp/cbor-records",
      "Kris_Zyp"
    ]
  },
  {
    "start": "57600",
    "end": "59999",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "60000",
    "end": "60000",
    "name": "The tagged CBOR array contains attestation evidence data with an Intel TEE quote.",
    "content": "",
    "references": [
      "Shanwei_Cen"
    ]
  },
  {
    "start": "60001",
    "end": "60001",
    "name": "The tagged CBOR array contains attestation evidence data with an Intel TEE report.",
    "content": "",
    "references": [
      "Shanwei_Cen"
    ]
  },
  {
    "start": "60002",
    "end": "60002",
    "name": "The tagged CBOR array contains attestation evidence data with an Intel SGX report.",
    "content": "",
    "references": [
      "Shanwei_Cen"
    ]
  },
  {
    "start": "60003",
    "end": "60009",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "60010",
    "end": "60010",
    "name": "The tagged CBOR array containing a numeric expression.",
    "content": "",
    "references": [
      "https://github.com/nedmsmith/draft-cds-rats-intel-corim-profile/blob/main/draft-cds-rats-intel-corim-profile.md",
      "Ned_Smith"
    ]
  },
  {
    "start": "60011",
    "end": "60019",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "60020",
    "end": "60020",
    "name": "The tagged CBOR array containing a set of digests expression.",
    "content": "",
    "references": [
      "https://github.com/nedmsmith/draft-cds-rats-intel-corim-profile/blob/main/draft-cds-rats-intel-corim-profile.md",
      "Ned_Smith"
    ]
  },
  {
    "start": "60021",
    "end": "60021",
    "name": "The tagged CBOR array containing a set of strings expression.",
    "content": "",
    "references": [
      "https://github.com/nedmsmith/draft-cds-rats-intel-corim-profile/blob/main/draft-cds-rats-intel-corim-profile.md",
      "Ned_Smith"
    ]
  },
  {
    "start": "60022",
    "end": "65534",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "65535",
    "end": "65535",
    "name": "always invalid; see Section 10.1",
    "content": "",
    "references": [
      "draft-bormann-cbor-notable-tags-02"
    ]
  },
  {
    "start": "65536",
    "end": "79999",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "80000",
    "end": "80099",
    "name": "Private tags as suggested in .",
    "content": "",
    "references": [
      "Tony_Putman"
    ]
  },
  {
    "start": "80100",
    "end": "80149",
    "name": "Private tags as suggested in .",
    "content": "",
    "references": [
      "Unchained_Infra_Ops"
    ]
  },
  {
    "start": "80150",
    "end": "80199",
    "name": "Private tags as suggested in .",
    "content": "",
    "references": [
      "Janis_Danisevskis"
    ]
  },
  {
    "start": "80200",
    "end": "133132",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "133133",
    "end": "133133",
    "name": "ZeWIF (Zcash Wallet Interchange Format) document; the tag encloses \na two-element array [version, payload] whose payload is a CBOR map conforming to the \nversion's ZeWIF schema. In a stored document this tag is enclosed in tag 55799 (Self-Described CBOR).",
    "content": "",
    "references": [
      "Kris_Nuttycombe",
      "https://github.com/zcash/zewif"
    ]
  },
  {
    "start": "133134",
    "end": "14245119",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "14245120",
    "end": "14245220",
    "name": "A tag within this range will indicate that a CBOR-encoded payload \ncontains a W3C verifiable credential, data integrity proof value. The additional \nspecificity of the tag in this range is use to identify a particular cryptographic \nsuite, cryptographic feature, or proof role (base or derived).",
    "content": "",
    "references": [
      "Greg_Bernstein"
    ]
  },
  {
    "start": "14245221",
    "end": "15309735",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "15309736",
    "end": "15309736",
    "name": "RAINS Message",
    "content": "",
    "references": [
      "https://britram.github.io/rains-prototype",
      "Brian_Trammell"
    ]
  },
  {
    "start": "15309737",
    "end": "1146111422",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1146111423",
    "end": "1146111423",
    "name": "TCG DICE Protection Environment profile descriptor",
    "content": "",
    "references": [
      "https://trustedcomputinggroup.org/wp-content/uploads/DICE-Protection-Environment-Version-1.0_pub.pdf",
      "TCG"
    ]
  },
  {
    "start": "1146111424",
    "end": "1298360422",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1298360423",
    "end": "1298360423",
    "name": "MoaT change-of-status marker",
    "content": "",
    "references": [
      "https://github.com/M-o-a-T/moat/blob/main/doc/common/cbor.rst",
      "Matthias_Urlichs"
    ]
  },
  {
    "start": "1298360424",
    "end": "1298493253",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1298493254",
    "end": "1298493254",
    "name": "MoaT end-of-file marker",
    "content": "",
    "references": [
      "https://github.com/M-o-a-T/moat-util/",
      "Matthias_Urlichs"
    ]
  },
  {
    "start": "1298493255",
    "end": "1299145043",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1299145044",
    "end": "1299145044",
    "name": "MoaT file identifier / details",
    "content": "",
    "references": [
      "https://github.com/M-o-a-T/moat-util/",
      "Matthias_Urlichs"
    ]
  },
  {
    "start": "1299145045",
    "end": "1330664269",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1330664270",
    "end": "1330664270",
    "name": "A CBOR encoded Openswan configuration file, as stored on disk for\nunit test cases.",
    "content": "",
    "references": [
      "Michael_Richardson",
      "Samir_Hussain"
    ]
  },
  {
    "start": "1330664271",
    "end": "1347571279",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1347571280",
    "end": "1347571280",
    "name": "A cryptographically anchored data structure used for digital \nauthorship attestation, capturing the authorship process through entangled \nVerifiable Delay Functions (VDFs) and behavioral biometrics.",
    "content": "",
    "references": [
      "https://writerslogic.com/rats/pop/spec/1.3.0/",
      "David_Lee_Condrey"
    ]
  },
  {
    "start": "1347571281",
    "end": "1347571281",
    "name": "A cryptographic pointer to a full Proof of Process Evidence \nPacket, used for embedding authorship claims in space-constrained contexts \n(e.g., metadata, QR codes).",
    "content": "",
    "references": [
      "https://writerslogic.com/rats/pop/spec/1.3.0/",
      "David_Lee_Condrey"
    ]
  },
  {
    "start": "1347571282",
    "end": "1347571541",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1347571542",
    "end": "1347571542",
    "name": "ur:provenance, Provenance Mark",
    "content": "",
    "references": [
      "https://github.com/BlockchainCommons/Research/blob/master/papers/bcr-2020-006-urtypes.md",
      "Wolf_McNally"
    ]
  },
  {
    "start": "1347571543",
    "end": "1398229315",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1398229316",
    "end": "1398229316",
    "name": "Concise Software Identifier (CoSWID)",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9393.html"
    ]
  },
  {
    "start": "1398229317",
    "end": "1413829459",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1413829460",
    "end": "1413829460",
    "name": "Explicitly none.",
    "content": "",
    "references": [
      "https://www.ietf.org/archive/id/draft-bormann-cbor-notable-tags-15.html#name-test-tag",
      "Joe_Hildebrand"
    ]
  },
  {
    "start": "1413829461",
    "end": "1463894559",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1463894560",
    "end": "1463894560",
    "name": "An Attestation Result structure produced by Verifiers \nappraising Proof of Process Evidence, conveying verification verdicts, \nconfidence scores, and forensic assessments per the IETF RATS architecture.",
    "content": "",
    "references": [
      "https://writerslogic.com/rats/pop/spec/1.3.0/",
      "David_Lee_Condrey"
    ]
  },
  {
    "start": "1463894561",
    "end": "1482048303",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1482048304",
    "end": "1482048346",
    "name": "Xbox Virtual Container identifiers for use with RFC 9277",
    "content": "",
    "references": [
      "Jon_Caruana"
    ]
  },
  {
    "start": "1482048347",
    "end": "1668546816",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1668546817",
    "end": "1668612095",
    "name": "the representation of content-format ct < 65025 is indicated by tag number TN(ct) = 0x63740101 + (ct / 255) * 256 + ct % 255",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9277.html"
    ]
  },
  {
    "start": "1668612096",
    "end": "1701996914",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1701996915",
    "end": "1701996915",
    "name": "Array of content-addressed blocks and ERIS read capabilities",
    "content": "",
    "references": [
      "Endo_Renberg"
    ]
  },
  {
    "start": "1701996916",
    "end": "1701996916",
    "name": "ERIS-FS image header",
    "content": "",
    "references": [
      "Endo_Renberg"
    ]
  },
  {
    "start": "1701996917",
    "end": "1735551331",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "1735551332",
    "end": "1735551332",
    "name": "PromiseGrid message envelope",
    "content": "",
    "references": [
      "Steve_Traugott"
    ]
  },
  {
    "start": "1735551333",
    "end": "4294967294",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "4294967295",
    "end": "4294967295",
    "name": "always invalid; see Section 10.1",
    "content": "",
    "references": [
      "draft-bormann-cbor-notable-tags-02"
    ]
  },
  {
    "start": "4294967296",
    "end": "4294967296",
    "name": "Intel FPGA SPDM Manifest",
    "content": "",
    "references": [
      "Andrew_Draper"
    ]
  },
  {
    "start": "4294967297",
    "end": "18446744073709551614",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "18446744073709551615",
    "end": "18446744073709551615",
    "name": "always invalid; Section 10.1",
    "content": "",
    "references": [
      "draft-bormann-cbor-notable-tags-02"
    ]
  },
  {
    "start": "0",
    "end": "0",
    "name": "UTC with POSIX Epoch",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9581.html"
    ]
  },
  {
    "start": "1",
    "end": "1",
    "name": "TAI with PTP Epoch",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9581.html"
    ]
  },
  {
    "start": "2",
    "end": "18446744073709551615",
    "name": "",
    "content": "",
    "references": []
  },
  {
    "start": "0",
    "end": "0",
    "name": "Unassigned",
    "content": "",
    "references": []
  },
  {
    "start": "1",
    "end": "1",
    "name": "base time value as in CBOR Tag 1",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8949.html",
      "https://www.rfc-editor.org/rfc/rfc9581.html"
    ]
  },
  {
    "start": "2",
    "end": "3",
    "name": "Unassigned",
    "content": "",
    "references": []
  },
  {
    "start": "4",
    "end": "4",
    "name": "base time value as in CBOR Tag 4",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8949.html",
      "https://www.rfc-editor.org/rfc/rfc9581.html"
    ]
  },
  {
    "start": "5",
    "end": "5",
    "name": "base time value as in CBOR Tag 5",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc8949.html",
      "https://www.rfc-editor.org/rfc/rfc9581.html"
    ]
  },
  {
    "start": "6",
    "end": "9",
    "name": "Unassigned",
    "content": "",
    "references": []
  },
  {
    "start": "10",
    "end": "10",
    "name": "IXDTF Time Zone Hint (critical)",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9581.html",
      "https://www.rfc-editor.org/rfc/rfc9557.html"
    ]
  },
  {
    "start": "11",
    "end": "11",
    "name": "IXDTF Suffix Information (critical)",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9581.html",
      "https://www.rfc-editor.org/rfc/rfc9557.html"
    ]
  },
  {
    "start": "12",
    "end": "12",
    "name": "Unassigned",
    "content": "",
    "references": []
  },
  {
    "start": "13",
    "end": "13",
    "name": "timescale (critical)",
    "content": "",
    "references": [
      "https://www.rfc-editor.org/rfc/rfc9581.html"
    ]
  },
  {
    "start": "14",
    "end": "18446744073709551615",
    "name": "Unassigned",
    "content": "",
    "references": []
  }
]

export function getTagDefinition(tag: number | bigint): TagDefinition | undefined {
  if (typeof tag === 'number' && (!Number.isSafeInteger(tag) || tag < 0)) return undefined
  const value = BigInt(tag)
  return TAG_DEFINITIONS.find(entry => value >= BigInt(entry.start) && value <= BigInt(entry.end))
}
