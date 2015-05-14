#!/usr/bin/env ruby

require 'JSON'
require 'CSV'

csv_file = ARGV[0] || 'HappyCowDataCleansedNYC-jmw.csv'

category_id = '5354ca6180e4b802000964cd'  # production ishiki
category_type_id = '5354ca7d80e4b802000964d0'  # production ishiki
category_subtype_id = '538802919e154c0200523822'   # production ishiki

puts "Attempting to generate JSON from '#{csv_file}'"

unless File.exists? csv_file
  puts "ERROR.  Could not find file '#{csv_file}\n"
  exit 1
end

# 0 : "Name","Area","Address","Phone","Cost","Description 1","Description 2","Rating",
#       0      1      2          3      4       5                  6            7

poi_list = []

# {
#   "_id": ObjectId("534f106b22e436df1cb679ca"),
#   "addr1": "a1",
#   "addr2": "a2",
#   "beacons": [
#     "bbb"
#   ],
#   "categoryId": "5352f7cf0be2c70e5a8f583a",
#   "city": "fdsafds",
#   "loc": {
#     "type": "Point",
#     "coordinates": [
#       23.432432099999999764,
#       -11.432100000000000151
#     ]
#   },
#   "name": "Business 1",
#   "phone": "4324324321",
#   "state": "NY",
#   "website": "http://example.org",
#   "zip": "10001"
# }

CSV.foreach(csv_file) do |row|
  #puts "csv row: #{row}"
  poi_list << {
    :name => row[0] || '',
    :addr1 => row[2] || '',
    :city => 'New York',
    :state => 'NY',
    :phone => row[3] || '',
    :description1 => row[5] || '',
    :description2 => row[6] || '',
    :costDesc => row[4] || '',
    :rating => row[7] || '',
    :categoryId => category_id,
    :categoryTypeId => category_type_id,
    :categorySubTypeId => category_subtype_id,
    :import_src => 'HappyCow'
  }
end

poi_json = poi_list.map(&:to_json).join("\n")

# (4..7).each { |i| puts "poi_list[#{i}] is: #{poi_list[i].to_json}"}

output_file = "#{File.basename(csv_file, '.csv')}.json"
puts "saving json to file: #{output_file}"
File.open(output_file, 'w') { |f| f.write(poi_json)}


