#!/usr/bin/env ruby

require 'JSON'

def usage
  puts "#{__FILE__} <json_file_prefix> [category_id] [category_type_id] [category_subtype_id]\n"
  puts "This will create a new file named exported-<json_file_prefix>.json which can be imported via"
  puts "    mongoimport -d <db> ..... --upsert <json_file_prefix>.exported.json\n"
end

if ARGV[0] =~ /help/i || ARGV.length < 1  || ARGV.length > 4
  usage
  exit 0
end

json_file_prefix = ARGV[0]
category_id = ARGV[1] || '5354ca6180e4b802000964cd'  # production ishiki
category_type_id = ARGV[2] || '5354ca7d80e4b802000964d0'  # production ishiki
## category_subtype_id = ARGV[3] || '538dc25d962bc80200579666'   # production ishiki

# localhost values:
# category_id = ARGV[1] || '5352f7660be2c70e5a8f5834'  # localhost ishiki
# category_type_id = ARGV[2] || '53548d3c8b1ed93c9866eaff'  # localhost ishiki
## category_subtype_id = ARGV[3] || '538dc07962562fd97dea9343'   # localhost ishiki


files_to_parse = Dir.glob("#{json_file_prefix}*.json")

puts "Attempting to generate JSON from these files:\n  #{files_to_parse.join("\n  ")}\n"

# unless File.exists? json_file
  # puts "ERROR.  Could not find file '#{json_file}\n"
  # usage
  # exit 1
# end

poi_list = []
all_file_data = []

files_to_parse.each do |filename|
  puts "attempting to parse #{filename}"
  File.open(filename, 'r') { |f| all_file_data += JSON.parse(f.read)["restaurants"] }
  puts "parsed #{filename}"
end

created_at = Time.now.to_i * 1000
all_file_data.each do |raw_poi|
  poi = {
    :name => raw_poi['name'] || '',
    :addr1 => raw_poi['address'] || '',
    :city => raw_poi['city'] || '',
    :state => raw_poi['state'] || '',
    :area => raw_poi['area'] || '',
    :zip => raw_poi['postal_code'] || '',
    :phone => raw_poi['phone'] || '',
    # :description1 => '',
    # :description2 => '',
    # :costDesc => '',
    # :rating => '',
    :categoryId => category_id,
    :categoryTypeId => category_type_id,
    # :categorySubTypeId => category_subtype_id,
    :import_src => 'opentable.nyc',
    :opentable => {
    	:reserve_url => raw_poi['reserve_url'] || '',
    	:mobile_reserve_url => raw_poi['mobile_reserve_url'] || ''
    },
    :createdAt => { '$date' => created_at }
  }
  poi_list << poi
end


poi_json = poi_list.map(&:to_json).join("\n")
output_file = "exported-#{json_file_prefix}.json"
puts "saving json to file: #{output_file}"
File.open(output_file, 'w') { |f| f.write(poi_json)}

puts "done.\n"



